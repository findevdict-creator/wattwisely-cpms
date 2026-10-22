import { PricingTariff } from '../model/pricing-tariff';
import { LineItem } from '../model/pricing-result';
import { PricedLine } from './priced-line';
import { TaxCalculator } from './tax.calculator';

/**
 * The minimum and maximum price (design, step 5): when the lines fall short of the
 * minimum or go past the maximum, one adjustment line makes up the difference.
 */
export class LimitAdjuster {
  constructor(
    private readonly tariff: Pick<PricingTariff, 'minimumPrice' | 'maximumPrice'>,
    private readonly tax: TaxCalculator,
  ) {}

  adjust(lines: LineItem[]): LineItem[] {
    const basis = this.tax.basisOf(lines);
    const difference = this.differenceFor(basis);
    if (difference === 0) {
      return lines;
    }
    const adjustment: PricedLine = {
      kind: 'adjustment',
      bandName: null,
      from: null,
      to: null,
      quantity: 1,
      unit: 'session',
      unitPrice: null,
      amount: difference,
    };
    return [...lines, this.tax.apply(adjustment)];
  }

  private differenceFor(basis: number): number {
    const { minimumPrice, maximumPrice } = this.tariff;
    if (minimumPrice !== null && basis < minimumPrice) {
      return minimumPrice - basis;
    }
    if (maximumPrice !== null && basis > maximumPrice) {
      return maximumPrice - basis;
    }
    return 0;
  }
}
