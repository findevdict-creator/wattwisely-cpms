/**
 * Unit prices and the tax rate are kept in ten-thousandths: 0.3450 per kWh is 3450 and
 * a 20% tax rate is 2000. Integer arithmetic with half-up rounding keeps every amount exact.
 */
export class Rate {
  static readonly SCALE = 10_000;

  /** numerator / denominator rounded half up (half away from zero for negatives), as an integer. */
  static divideHalfUp(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      throw new Error('The denominator must be positive.');
    }
    const sign = numerator < 0 ? -1 : 1;
    const magnitude = Math.abs(numerator);
    return sign * Math.floor((2 * magnitude + denominator) / (2 * denominator));
  }

  /** A decimal such as 0.345 as ten-thousandths (3450). */
  static fromDecimal(value: number): number {
    return Math.round(value * Rate.SCALE);
  }

  static toDecimal(rate: number): number {
    return rate / Rate.SCALE;
  }
}
