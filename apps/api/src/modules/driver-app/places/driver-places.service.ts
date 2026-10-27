import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { DriverAccount } from '../../../common/account/driver-account';
import { RequestAuth } from '../../../common/request/request-auth';
import { PaymentErrors } from '../../payments/payment-errors';
import { ChargePlaceLookup, PublicCharger } from '../../payments/public/charge-place.lookup';
import { PublicPlaceView } from '../../drivers/places/dto/public-place.dto';
import { PlaceDescriber } from '../../drivers/places/place-describer';
import { DriverPlaceAccessDto } from './dto/driver-place-access.dto';
import { DriverPlaceDto } from './dto/driver-place.dto';
import { DriverPlaceAccess, DriverPlaceAccessPolicy } from './driver-place-access';
import { DriverPlaceAccessResolver } from './driver-place-access.resolver';

/** Everything the resolved place knows, for the start as well as the page. */
export interface DriverPlace {
  charger: PublicCharger;
  view: PublicPlaceView;
  access: DriverPlaceAccess;
}

/**
 * What a logged-in driver sees after scanning a plug (module 19): the public page's facts and,
 * on top, whether they may charge here and who pays. Found the way the public page is: the
 * charger by its identity, then everything else inside its tenant.
 */
@Injectable()
export class DriverPlacesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly places: ChargePlaceLookup,
    private readonly describer: PlaceDescriber,
    private readonly resolver: DriverPlaceAccessResolver,
  ) {}

  async get(auth: RequestAuth, identity: string, connector: string): Promise<DriverPlaceDto> {
    const account = auth.requireDriver();
    const charger = await this.charger(identity);
    return this.runner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) =>
      DriverPlacesService.dto(
        await this.resolve(tx, account, charger, DriverPlacesService.numberOf(connector)),
      ),
    );
  }

  async charger(identity: string): Promise<PublicCharger> {
    const charger = await this.runner.run(DatabaseSession.forChargerIdentity(identity), (tx) =>
      this.places.charger(tx, identity),
    );
    if (!charger) {
      throw PaymentErrors.chargerNotFound();
    }
    return charger;
  }

  /** Inside the charger's tenant: the plug and the driver's access to it. 404 for an unknown plug. */
  async resolve(
    tx: Transaction,
    account: DriverAccount,
    charger: PublicCharger,
    ocppConnectorId: number | null,
  ): Promise<DriverPlace> {
    const access = await this.resolver.resolve(tx, account, charger);
    const guestHold = access.isPaymentAccepted ? (access.account?.holdAmount ?? null) : null;
    const view = await this.describer.view(tx, charger, ocppConnectorId, guestHold);
    return { charger, view, access };
  }

  static dto(place: DriverPlace): DriverPlaceDto {
    const refusal = DriverPlaceAccessPolicy.refusal(place.access, {
      availability: place.view.availability,
      hasTariff: place.view.tariff !== null,
    });
    return new DriverPlaceDto(place.view, new DriverPlaceAccessDto(place.access, refusal));
  }

  static numberOf(text: string): number | null {
    return /^\d{1,3}$/.test(text) ? Number(text) : null;
  }
}
