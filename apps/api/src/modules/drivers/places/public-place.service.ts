import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import {
  AccountStatusPolicy,
  PAYMENT_GATEWAY,
  PaymentAccountStore,
  PaymentGateway,
} from '@wattwisely/payments';
import { ChargersRepository } from '../../assets/chargers/chargers.repository';
import { PaymentErrors } from '../../payments/payment-errors';
import { ChargePlaceLookup, PublicCharger } from '../../payments/public/charge-place.lookup';
import { CurrentBandFinder } from './current-band.finder';
import { PublicPlaceDto } from './dto/public-place.dto';
import { PublicTariffDto } from './dto/public-tariff.dto';
import { PlaceAvailabilityPolicy } from './place-availability';
import { PlaceSiteLookup } from './place-site.lookup';
import { PlaceTariffLookup } from './place-tariff.lookup';

/**
 * What a driver sees after scanning the QR code on a plug, before paying: the operator,
 * the site, whether the plug can be used now, the prices, and the card hold. Found the
 * way a paid charge starts (module 6): the charger by its identity, then everything
 * else inside its tenant.
 */
@Injectable()
export class PublicPlaceService {
  private readonly accounts = new PaymentAccountStore();
  private readonly sites = new PlaceSiteLookup();
  private readonly tariffs = new PlaceTariffLookup();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly places: ChargePlaceLookup,
    private readonly chargers: ChargersRepository,
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
    return this.runner.run(DatabaseSession.forTenant(charger.tenantId), (tx) =>
      this.describe(tx, charger, ocppConnectorId),
    );
  }

  private async describe(
    tx: Transaction,
    charger: PublicCharger,
    ocppConnectorId: number | null,
  ): Promise<PublicPlaceDto> {
    const record = await this.chargers.findById(tx, charger.id);
    const connector =
      ocppConnectorId === null
        ? null
        : await this.places.connector(tx, charger.id, ocppConnectorId);
    const site = await this.sites.forCharger(tx, charger.id);
    if (!record || !connector || !site) {
      throw PaymentErrors.connectorNotFound();
    }
    const tariff = await this.tariffs.forCharger(tx, charger.id);
    const holdAmount = await this.holdAmount(tx);
    return new PublicPlaceDto({
      site,
      charger: record,
      connector,
      availability: PlaceAvailabilityPolicy.of({
        isOnline: record.isOnline,
        connectorStatus: connector.status,
        isBusy: await this.places.isBusy(tx, connector.id),
      }),
      isCardPaymentAccepted: holdAmount !== null && tariff !== null,
      holdAmount,
      tariff: tariff ? PublicPlaceService.tariffDto(tariff, new Date()) : null,
    });
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

  private static tariffDto(
    tariff: NonNullable<Awaited<ReturnType<PlaceTariffLookup['forCharger']>>>,
    now: Date,
  ): PublicTariffDto {
    const currentBand = CurrentBandFinder.nameAt(tariff.version.bands, tariff.timeZone, now);
    return new PublicTariffDto(tariff, currentBand);
  }

  private static numberOf(text: string): number | null {
    return /^\d{1,3}$/.test(text) ? Number(text) : null;
  }
}
