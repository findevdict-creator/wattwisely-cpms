import { PricingTariff } from '@wattwisely/pricing';
import { TariffVersionRow } from '../store/tariff-version-store';

/** Turns a stored tariff version into the pricing engine's input. */
export class TariffMapper {
  static toPricing(version: TariffVersionRow, currency: string, timeZone: string): PricingTariff {
    return {
      currency,
      timeZone,
      taxRate: version.taxRate,
      isTaxIncluded: version.isTaxIncluded,
      startFee: version.startFee,
      idleGraceMinutes: version.idleGraceMinutes,
      idleFeeCap: version.idleFeeCap,
      minimumPrice: version.minimumPrice,
      maximumPrice: version.maximumPrice,
      isFreeWithoutEnergy: version.isFreeWithoutEnergy,
      bands: version.bands,
    };
  }
}
