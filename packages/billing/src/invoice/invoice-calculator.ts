import { BillingPeriod } from '../period/billing-period';
import { DaySpan, Proration } from '../period/proration';
import { InvoiceDraft, InvoiceLineDraft, InvoiceLineKind } from './invoice-draft';
import { AddonCharge, InvoiceInput, UsageCounts } from './invoice-input';
import { MinorUnits } from './minor-units';

/** A monthly fee before proration. */
interface FeeLine {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  unitPrice: number;
  details?: Record<string, unknown>;
}

/**
 * Turns a tenant's month into invoice lines (module 15): the plan's fee and its connector
 * fees for the days the plan was in force, each add-on for its days, the managed service fee
 * for its days, and the plan's share of the month's charging revenue. Pure: what it reads is
 * in the input, what it could not bill is in the remarks.
 */
export class InvoiceCalculator {
  static readonly NO_DAYS: DaySpan = { days: 0, fromDay: 0, toDay: 0 };

  static calculate(input: InvoiceInput): InvoiceDraft {
    const remarks: string[] = [];
    const planSpan = InvoiceCalculator.planSpan(input);
    const lines = [
      ...InvoiceCalculator.planLines(input, planSpan),
      ...InvoiceCalculator.addonLines(input, planSpan, remarks),
      ...InvoiceCalculator.managedLines(input),
      ...InvoiceCalculator.revenueLines(input, remarks),
    ];
    return { currency: input.plan.currency, lines, remarks };
  }

  /** The days of the month the plan is paid for: from the day it started, or the day the trial ended. */
  static planSpan(input: InvoiceInput): DaySpan {
    const { subscription, period } = input;
    if (subscription.status === 'cancelled') {
      return InvoiceCalculator.NO_DAYS;
    }
    if (subscription.status === 'trialing') {
      return subscription.trialEndsAt
        ? Proration.daysOf(period, subscription.trialEndsAt, null)
        : InvoiceCalculator.NO_DAYS;
    }
    return Proration.daysOf(period, subscription.startedAt, null);
  }

  private static planLines(input: InvoiceInput, span: DaySpan): InvoiceLineDraft[] {
    const { plan, usage, period } = input;
    if (span.days === 0) {
      return [];
    }
    const suffix = Proration.suffix(span, period);
    const fees: FeeLine[] = [
      {
        kind: 'platform_fee',
        description: `${plan.name} plan${suffix}`,
        quantity: 1,
        unitPrice: plan.platformFee,
      },
      {
        kind: 'ac_connector_fee',
        description: `AC connectors${suffix}`,
        quantity: usage.acConnectors,
        unitPrice: plan.acConnectorFee,
      },
      {
        kind: 'dc_connector_fee',
        description: `DC connectors${suffix}`,
        quantity: usage.dcConnectors,
        unitPrice: plan.dcConnectorFee,
      },
    ];
    return fees
      .filter((fee) => fee.unitPrice > 0 && fee.quantity > 0)
      .map((fee) => InvoiceCalculator.line(fee, span, period));
  }

  private static addonLines(input: InvoiceInput, planSpan: DaySpan, remarks: string[]) {
    const lines: InvoiceLineDraft[] = [];
    for (const addon of input.addons) {
      if (addon.currency !== input.plan.currency) {
        remarks.push(
          `The ${addon.name} add-on is priced in ${addon.currency} and the plan in ${input.plan.currency}; it was left out.`,
        );
        continue;
      }
      const own = Proration.daysOf(input.period, addon.from, addon.to);
      const span = Proration.overlap(planSpan, own);
      const quantity = InvoiceCalculator.unitsOf(addon, input.usage);
      if (addon.price > 0 && quantity > 0 && span.days > 0) {
        lines.push(InvoiceCalculator.addonLine(addon, quantity, span, input.period));
      }
    }
    return lines;
  }

  private static addonLine(
    addon: AddonCharge,
    quantity: number,
    span: DaySpan,
    period: BillingPeriod,
  ) {
    return InvoiceCalculator.line(
      {
        kind: 'addon',
        description: `${addon.name} add-on${Proration.suffix(span, period)}`,
        quantity,
        unitPrice: addon.price,
        details: { module_key: addon.key, pricing_unit: addon.pricingUnit },
      },
      span,
      period,
    );
  }

  /** What an add-on's price is multiplied by. */
  static unitsOf(addon: Pick<AddonCharge, 'pricingUnit'>, usage: UsageCounts): number {
    switch (addon.pricingUnit) {
      case 'per_connector':
        return usage.acConnectors + usage.dcConnectors;
      case 'per_site':
        return usage.sites;
      default:
        return 1;
    }
  }

  private static managedLines(input: InvoiceInput): InvoiceLineDraft[] {
    const lines: InvoiceLineDraft[] = [];
    for (const service of input.managedServices) {
      const span = Proration.daysOf(input.period, service.from, service.to);
      if (service.monthlyFee > 0 && span.days > 0) {
        const reference = service.reference ? ` (${service.reference})` : '';
        const fee: FeeLine = {
          kind: 'managed_service',
          description: `Managed service${reference}${Proration.suffix(span, input.period)}`,
          quantity: 1,
          unitPrice: service.monthlyFee,
          details: { agreement_reference: service.reference },
        };
        lines.push(InvoiceCalculator.line(fee, span, input.period));
      }
    }
    return lines;
  }

  private static revenueLines(input: InvoiceInput, remarks: string[]): InvoiceLineDraft[] {
    const bps = input.plan.revenueShareBps;
    if (bps === 0) {
      return [];
    }
    const lines: InvoiceLineDraft[] = [];
    for (const total of input.revenue.filter((row) => row.gross > 0)) {
      const revenue = `${MinorUnits.text(total.gross, total.currency)} from ${total.sessions} sessions`;
      if (total.currency !== input.plan.currency) {
        remarks.push(
          `Charging revenue of ${revenue} was left out of the revenue share: the plan is billed in ${input.plan.currency}.`,
        );
        continue;
      }
      lines.push({
        kind: 'revenue_share',
        description: `${MinorUnits.percent(bps)} of charging revenue, ${revenue}`,
        quantity: 1,
        unitPrice: null,
        amount: Math.round((total.gross * bps) / 10_000),
        details: { revenue_gross: total.gross, sessions: total.sessions, revenue_share_bps: bps },
      });
    }
    return lines;
  }

  private static line(fee: FeeLine, span: DaySpan, period: BillingPeriod): InvoiceLineDraft {
    return {
      kind: fee.kind,
      description: fee.description,
      quantity: fee.quantity,
      unitPrice: fee.unitPrice,
      amount: Proration.amount(fee.quantity * fee.unitPrice, span, period),
      details: { ...fee.details, days: span.days, days_in_month: period.days },
    };
  }
}
