import { PricingTariff } from '../model/pricing-tariff';
import { LineItem } from '../model/pricing-result';
import { Rate } from '../model/rate';
import { PricedLine, PricedLines } from './priced-line';

/**
 * Tax per line (design, step 7). Prices that include tax: the amount is the gross and the
 * tax is gross × rate ÷ (1 + rate). Prices without tax: the amount is the net and the tax
 * is net × rate. Each is rounded half up once.
 */
export class TaxCalculator {
  constructor(private readonly tariff: Pick<PricingTariff, 'taxRate' | 'isTaxIncluded'>) {}

  apply(line: PricedLine): LineItem {
    const details = PricedLines.detailsOf(line);
    const rate = this.tariff.taxRate;
    if (this.tariff.isTaxIncluded) {
      const tax = Rate.divideHalfUp(line.amount * rate, Rate.SCALE + rate);
      return { ...details, gross: line.amount, tax, net: line.amount - tax };
    }
    const tax = Rate.divideHalfUp(line.amount * rate, Rate.SCALE);
    return { ...details, net: line.amount, tax, gross: line.amount + tax };
  }

  /** The amount the tariff's prices express: the gross when they include tax, else the net. */
  basisOf(lines: LineItem[]): number {
    return lines.reduce(
      (sum, line) => sum + (this.tariff.isTaxIncluded ? line.gross : line.net),
      0,
    );
  }
}
