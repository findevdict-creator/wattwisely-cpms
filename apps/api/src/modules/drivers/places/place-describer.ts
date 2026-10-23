import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ChargerRecord } from '../../assets/chargers/charger-record';
import { ChargersRepository } from '../../assets/chargers/chargers.repository';
import { TenantBrandLookup } from '../../branding/tenant-brand.lookup';
import { PaymentErrors } from '../../payments/payment-errors';
import {
  ChargePlaceLookup,
  PublicCharger,
  PublicConnector,
} from '../../payments/public/charge-place.lookup';
import { CurrentBandFinder } from './current-band.finder';
import { PublicPlaceDto } from './dto/public-place.dto';
import { PublicTariffDto } from './dto/public-tariff.dto';
import { PlaceAvailability, PlaceAvailabilityPolicy } from './place-availability';
import { PlaceSiteLookup } from './place-site.lookup';
import { PlaceTariffLookup } from './place-tariff.lookup';

/**
 * Puts together what the driver's page shows about a plug, inside the charger's tenant:
 * the site, the plug, whether it can be used now, the prices, and the operator's brand.
 */
@Injectable()
export class PlaceDescriber {
  private readonly sites = new PlaceSiteLookup();
  private readonly tariffs = new PlaceTariffLookup();

  constructor(
    private readonly places: ChargePlaceLookup,
    private readonly chargers: ChargersRepository,
    private readonly brands: TenantBrandLookup,
  ) {}

  /** `holdAmount` is null when the company cannot take card payments at all. */
  async describe(
    tx: Transaction,
    charger: PublicCharger,
    ocppConnectorId: number | null,
    holdAmount: number | null,
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
    return new PublicPlaceDto({
      site,
      charger: record,
      connector,
      availability: await this.availabilityOf(tx, record, connector),
      isCardPaymentAccepted: holdAmount !== null && tariff !== null,
      holdAmount,
      tariff: tariff ? PlaceDescriber.tariffDto(tariff, new Date()) : null,
      brand: await this.brands.current(tx, charger.tenantId),
    });
  }

  private async availabilityOf(
    tx: Transaction,
    record: ChargerRecord,
    connector: PublicConnector,
  ): Promise<PlaceAvailability> {
    return PlaceAvailabilityPolicy.of({
      isOnline: record.isOnline,
      connectorStatus: connector.status,
      isBusy: await this.places.isBusy(tx, connector.id),
    });
  }

  private static tariffDto(
    tariff: NonNullable<Awaited<ReturnType<PlaceTariffLookup['forCharger']>>>,
    now: Date,
  ): PublicTariffDto {
    const currentBand = CurrentBandFinder.nameAt(tariff.version.bands, tariff.timeZone, now);
    return new PublicTariffDto(tariff, currentBand);
  }
}
