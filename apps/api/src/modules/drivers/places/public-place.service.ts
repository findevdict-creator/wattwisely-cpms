import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import {
  AccountStatusPolicy,
  PAYMENT_GATEWAY,
  PaymentAccountStore,
  PaymentGateway,
} from '@wattwisely/payments';
import { PaymentErrors } from '../../payments/payment-errors';
import { ChargePlaceLookup } from '../../payments/public/charge-place.lookup';
import { PublicPlaceDto } from './dto/public-place.dto';
import { PlaceDescriber } from './place-describer';

/**
 * What a driver sees after scanning the QR code on a plug, before paying: the operator,
 * the site, whether the plug can be used now, the prices, and the card hold. Found the
 * way a paid charge starts (module 6): the charger by its identity, then everything
 * else inside its tenant.
 */
@Injectable()
export class PublicPlaceService {
  private readonly accounts = new PaymentAccountStore();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly places: ChargePlaceLookup,
    private readonly describer: PlaceDescriber,
  ) {}

  /** 404 for an unknown charger or plug, including a plug number that is not a number. */
  async get(identity: string, connector: string): Promise<PublicPlaceDto> {
    const charger = await this.runner.run(DatabaseSession.forChargerIdentity(identity), (tx) =>
      this.places.charger(tx, identity),
    );
    if (!charger) {
      throw PaymentErrors.chargerNotFound();
    }
    const ocppConnectorId = PublicPlaceService.numberOf(connector);
    return this.runner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) =>
      this.describer.describe(tx, charger, ocppConnectorId, await this.holdAmount(tx)),
    );
  }

  /** The hold the company takes, or null when it cannot take card payments (no provider, no active account). */
  private async holdAmount(tx: Transaction): Promise<number | null> {
    if (!this.gateway.isEnabled) {
      return null;
    }
    const account = await this.accounts.findCurrent(tx);
    return account && AccountStatusPolicy.canTakePayments(account.status)
      ? account.holdAmount
      : null;
  }

  private static numberOf(text: string): number | null {
    return /^\d{1,3}$/.test(text) ? Number(text) : null;
  }
}
