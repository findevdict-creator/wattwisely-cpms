import { TariffBand } from './tariff-band';

/**
 * A tariff version as the pricing engine reads it (the PricingInput's tariff half).
 * Amounts (start fee, caps, limits) are integer minor units of `currency`; the tax rate
 * is in ten-thousandths (2000 is 20%). The bands must cover every hour of the week.
 */
export interface PricingTariff {
  /** ISO 4217 code, e.g. "GBP". */
  currency: string;
  /** IANA time zone of the site, e.g. "Europe/London"; band times are read in it. */
  timeZone: string;
  taxRate: number;
  /** True when the band prices already include tax (what the receipt shows is the gross). */
  isTaxIncluded: boolean;
  startFee: number;
  idleGraceMinutes: number;
  idleFeeCap: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  /** The default: a session that delivered no energy costs nothing. */
  isFreeWithoutEnergy: boolean;
  bands: TariffBand[];
}
