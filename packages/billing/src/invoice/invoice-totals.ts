/** The sums at the bottom of an invoice. */
export interface InvoiceTotalAmounts {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** Adds the lines up and puts the tax on top, rounded once, to the nearest minor unit. */
export class InvoiceTotals {
  static of(lines: { amount: number }[], taxRateBps: number): InvoiceTotalAmounts {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const taxAmount = Math.round((subtotal * taxRateBps) / 10_000);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }
}
