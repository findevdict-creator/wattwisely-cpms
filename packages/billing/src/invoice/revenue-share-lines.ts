import { InvoiceLineDraft } from './invoice-draft';
import { InvoiceInput } from './invoice-input';
import { MinorUnits } from './minor-units';

/**
 * The plan's share of the previous month's charging revenue, billed in arrears on the
 * month's invoice (module 15): one line per currency the plan is billed in; revenue in
 * another currency goes to the remarks, since there is no rate to convert it at.
 */
export class RevenueShareLines {
  static of(input: InvoiceInput, remarks: string[]): InvoiceLineDraft[] {
    const bps = input.plan.revenueShareBps;
    if (bps === 0) {
      return [];
    }
    const lines: InvoiceLineDraft[] = [];
    const month = input.revenuePeriod.label;
    for (const total of input.revenue.filter((row) => row.gross > 0)) {
      const revenue = `${MinorUnits.text(total.gross, total.currency)} from ${total.sessions} sessions`;
      if (total.currency !== input.plan.currency) {
        remarks.push(
          `Charging revenue of ${revenue} in ${month} was left out of the revenue share: the plan is billed in ${input.plan.currency}.`,
        );
        continue;
      }
      lines.push(RevenueShareLines.line(input, total, revenue));
    }
    return lines;
  }

  private static line(
    input: InvoiceInput,
    total: InvoiceInput['revenue'][number],
    revenue: string,
  ): InvoiceLineDraft {
    const bps = input.plan.revenueShareBps;
    return {
      kind: 'revenue_share',
      description: `${MinorUnits.percent(bps)} of charging revenue in ${input.revenuePeriod.label}, ${revenue}`,
      quantity: 1,
      unitPrice: null,
      amount: Math.round((total.gross * bps) / 10_000),
      details: {
        revenue_month: input.revenuePeriod.key,
        revenue_gross: total.gross,
        sessions: total.sessions,
        revenue_share_bps: bps,
      },
    };
  }
}
