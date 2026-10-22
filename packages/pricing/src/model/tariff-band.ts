import { Weekday } from './weekday';

/**
 * One price band of a tariff: on these days, between these local times, these prices.
 * Prices are in ten-thousandths of the currency's major unit (0.3450 per kWh is 3450),
 * so four decimals stay exact (Sessions and Pricing design, "Money is integer minor units").
 */
export interface TariffBand {
  /** Shown on receipts, e.g. "Peak". */
  name: string;
  days: Weekday[];
  /** Local time "HH:MM" the band starts. */
  start: string;
  /** Local time "HH:MM" it ends ("24:00" for midnight). An end before the start wraps into the next day. */
  end: string;
  energyPricePerKwh: number;
  timePricePerHour: number;
  idleFeePerMinute: number;
}
