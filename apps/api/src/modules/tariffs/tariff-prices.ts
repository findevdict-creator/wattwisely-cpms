import { StoredTariffBand, tariffVersions } from '@wattwisely/db';
import { PricingTariff, Rate } from '@wattwisely/pricing';
import { TariffBandDto } from './dto/tariff-band.dto';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';

/** A tariff version as stored. */
export type TariffVersionRow = typeof tariffVersions.$inferSelect;

/**
 * Converts between the API's prices (decimal strings, a tax percentage) and the stored
 * and engine form (integer ten-thousandths), exactly: "0.3450" is 3450, "20.00" % is 2000.
 */
export class TariffPrices {
  /** "0.3450" in major units as ten-thousandths. */
  static fromDecimal(text: string): number {
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * Rate.SCALE + Number(fraction.padEnd(4, '0').slice(0, 4));
  }

  static toDecimal(value: number): string {
    return (value / Rate.SCALE).toFixed(4);
  }

  /** "20.00" percent as ten-thousandths of one (2000). */
  static rateFromPercent(text: string): number {
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
  }

  static rateToPercent(rate: number): string {
    return (rate / 100).toFixed(2);
  }

  static bandsFrom(bands: TariffBandDto[]): StoredTariffBand[] {
    return bands.map((band) => ({
      name: band.name.trim(),
      days: band.days,
      start: band.start,
      end: band.end,
      energyPricePerKwh: TariffPrices.fromDecimal(band.energy_price_per_kwh),
      timePricePerHour: TariffPrices.fromDecimal(band.time_price_per_hour),
      idleFeePerMinute: TariffPrices.fromDecimal(band.idle_fee_per_minute),
    }));
  }

  /** The columns of a new version, apart from its ids and number. */
  static versionColumns(request: TariffPricesRequestDto) {
    return {
      taxRate: TariffPrices.rateFromPercent(request.tax_rate),
      isTaxIncluded: request.is_tax_included,
      startFee: request.start_fee,
      idleGraceMinutes: request.idle_grace_minutes,
      idleFeeCap: request.idle_fee_cap ?? null,
      minimumPrice: request.minimum_price ?? null,
      maximumPrice: request.maximum_price ?? null,
      isFreeWithoutEnergy: request.is_free_without_energy,
      bands: TariffPrices.bandsFrom(request.bands),
      note: request.note?.trim() ?? '',
    };
  }

  /** The engine's tariff for a preview. */
  static toPricing(
    request: TariffPricesRequestDto,
    currency: string,
    timeZone: string,
  ): PricingTariff {
    const columns = TariffPrices.versionColumns(request);
    return {
      currency,
      timeZone,
      taxRate: columns.taxRate,
      isTaxIncluded: columns.isTaxIncluded,
      startFee: columns.startFee,
      idleGraceMinutes: columns.idleGraceMinutes,
      idleFeeCap: columns.idleFeeCap,
      minimumPrice: columns.minimumPrice,
      maximumPrice: columns.maximumPrice,
      isFreeWithoutEnergy: columns.isFreeWithoutEnergy,
      bands: columns.bands,
    };
  }
}
