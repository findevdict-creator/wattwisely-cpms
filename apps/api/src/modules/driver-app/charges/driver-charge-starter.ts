import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import {
  PaidSessionOpener,
  PAYMENT_GATEWAY,
  PaymentGateway,
  RemoteSessionStarter,
  SavedCardHoldPlacer,
} from '@wattwisely/payments';
import { SessionRow } from '@wattwisely/session-engine';
import { RequestAuth } from '../../../common/request/request-auth';
import { PaymentErrors } from '../../payments/payment-errors';
import { PublicCharger } from '../../payments/public/charge-place.lookup';
import { DriverAppErrors } from '../driver-app-errors';
import { DriverPlaceAccessPolicy } from '../places/driver-place-access';
import { DriverPlace, DriverPlacesService } from '../places/driver-places.service';
import { StartDriverChargeRequestDto } from './dto/start-driver-charge-request.dto';
import { GuestRecordWriter } from './guest-record.writer';

/** What a start leaves behind: the session, whose record it is, and the key for a paid one. */
export interface StartedCharge {
  sessionId: string;
  driverId: string;
  /** The public charge page's key, for a paid start; null for a free one. */
  chargeKey: string | null;
}

/**
 * A charge started from the driver app (module 19): the plug and the driver's access are
 * resolved as the page saw them, a guest gets their record first with their consent, then
 * the session opens as a start from the app. A `pay` rule takes the hold from the saved card
 * on the spot, and a confirmed hold sends RemoteStart; a `free` rule sends it at once.
 */
@Injectable()
export class DriverChargeStarter {
  private readonly opener = new PaidSessionOpener();
  private readonly starter = new RemoteSessionStarter();
  private readonly placer: SavedCardHoldPlacer;

  constructor(
    @Inject(PAYMENT_GATEWAY) gateway: PaymentGateway,
    private readonly places: DriverPlacesService,
    private readonly guests: GuestRecordWriter,
  ) {
    this.placer = new SavedCardHoldPlacer(gateway);
  }

  /** The charger the body names, found before its tenant is known; 404 when unknown. */
  charger(identity: string): Promise<PublicCharger> {
    return this.places.charger(identity);
  }

  /** Runs inside the charger's tenant. */
  async start(
    tx: Transaction,
    auth: RequestAuth,
    charger: PublicCharger,
    body: StartDriverChargeRequestDto,
  ): Promise<StartedCharge> {
    const account = auth.requireDriver();
    let place = await this.places.resolve(tx, account, charger, body.ocpp_connector_id);
    if (!place.access.driver) {
      if (!body.is_consent_given) {
        throw DriverAppErrors.consentRequired();
      }
      await this.guests.create(tx, auth, charger);
      place = await this.places.resolve(tx, account, charger, body.ocpp_connector_id);
    }
    const refusal = DriverPlaceAccessPolicy.refusal(place.access, {
      availability: place.view.availability,
      hasTariff: place.view.tariff !== null,
    });
    if (refusal) {
      throw DriverAppErrors.cannotCharge(refusal);
    }
    return this.open(tx, place);
  }

  private async open(tx: Transaction, place: DriverPlace): Promise<StartedCharge> {
    const { access, view } = place;
    const driver = access.driver;
    if (!driver) {
      throw DriverAppErrors.consentRequired();
    }
    const now = new Date();
    const { holdAmount, ...rule } = access.rule;
    const session = await this.opener.open(
      tx,
      {
        tenantId: access.tenantId,
        chargerId: place.charger.id,
        connectorId: view.connector.id,
        driverId: driver.id,
        startSource: 'account',
        paymentRule: rule,
      },
      now,
    );
    if (rule.outcome === 'free' || !access.account || !access.card || holdAmount === null) {
      await this.starter.start(tx, session, now, null);
      return { sessionId: session.id, driverId: driver.id, chargeKey: null };
    }
    const description = `EV charging at ${place.charger.identity} ${view.connector.label}`;
    const hold = { session, account: access.account, card: access.card, holdAmount, description };
    const placed = await this.place(tx, hold, now);
    return { sessionId: session.id, driverId: driver.id, chargeKey: placed };
  }

  /** The hold on the saved card; a provider outage is the driver's problem to retry, as a 503. */
  private async place(
    tx: Transaction,
    hold: Parameters<SavedCardHoldPlacer['place']>[1] & { session: SessionRow },
    now: Date,
  ): Promise<string> {
    try {
      return (await this.placer.place(tx, hold, now)).chargeKey;
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }
}
