import { LineItem, LineKind, LineUnit } from '../model/pricing-result';

/** A receipt line before tax is worked out: one rounded amount at the tariff's prices. */
export interface PricedLine {
  kind: LineKind;
  bandName: string | null;
  from: Date | null;
  to: Date | null;
  quantity: number;
  unit: LineUnit;
  unitPrice: number | null;
  amount: number;
}

export class PricedLines {
  /** A line's identity without its amounts, for building the taxed line. */
  static detailsOf(line: PricedLine): Omit<LineItem, 'net' | 'tax' | 'gross'> {
    const { amount: _amount, ...details } = line;
    return details;
  }

  static minutes(seconds: number): number {
    return Math.round((seconds / 60) * 1000) / 1000;
  }
}
