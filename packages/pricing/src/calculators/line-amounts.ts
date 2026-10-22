import { Currency } from '../model/currency';
import { Rate } from '../model/rate';

/**
 * Turns a quantity and a unit price into minor units, rounded half up once per line
 * (Sessions and Pricing design, step 6). Prices are ten-thousandths of a major unit.
 */
export class LineAmounts {
  private readonly minorPerMajor: number;

  constructor(currency: string) {
    this.minorPerMajor = Currency.minorPerMajor(currency);
  }

  /** Wh at a price per kWh. */
  energy(wh: number, pricePerKwh: number): number {
    return Rate.divideHalfUp(wh * pricePerKwh * this.minorPerMajor, 1000 * Rate.SCALE);
  }

  /** Seconds at a price per hour. */
  time(seconds: number, pricePerHour: number): number {
    return Rate.divideHalfUp(seconds * pricePerHour * this.minorPerMajor, 3600 * Rate.SCALE);
  }

  /** Seconds at a price per minute. */
  idle(seconds: number, pricePerMinute: number): number {
    return Rate.divideHalfUp(seconds * pricePerMinute * this.minorPerMajor, 60 * Rate.SCALE);
  }
}
