import { BillingPeriod } from '../period/billing-period';
import { InvoiceCalculator } from './invoice-calculator';
import { InvoiceInput } from './invoice-input';
import { InvoiceTotals } from './invoice-totals';

describe('InvoiceCalculator', () => {
  const september = BillingPeriod.of(2026, 9);
  const growth: InvoiceInput['plan'] = {
    code: 'growth',
    name: 'Growth',
    currency: 'USD',
    platformFee: 29_900,
    acConnectorFee: 1_000,
    dcConnectorFee: 1_600,
    revenueShareBps: 0,
  };
  const input = (overrides: Partial<InvoiceInput> = {}): InvoiceInput => ({
    period: september,
    plan: growth,
    subscription: {
      status: 'active',
      startedAt: new Date('2026-01-01T00:00:00Z'),
      trialEndsAt: null,
      taxRateBps: 2_000,
      billingName: 'Acme Charging Ltd',
      billingEmail: 'accounts@acme.test',
      billingReference: 'PO-77',
    },
    usage: { acConnectors: 5, dcConnectors: 2, sites: 2 },
    addons: [],
    managedServices: [],
    revenue: [],
    ...overrides,
  });

  it('bills the plan fee and the connectors for a whole month, with the tax on top', () => {
    const draft = InvoiceCalculator.calculate(input());

    expect(draft.currency).toBe('USD');
    expect(draft.lines).toEqual([
      expect.objectContaining({ kind: 'platform_fee', description: 'Growth plan', amount: 29_900 }),
      expect.objectContaining({
        kind: 'ac_connector_fee',
        quantity: 5,
        unitPrice: 1_000,
        amount: 5_000,
      }),
      expect.objectContaining({
        kind: 'dc_connector_fee',
        quantity: 2,
        unitPrice: 1_600,
        amount: 3_200,
      }),
    ]);
    expect(draft.remarks).toEqual([]);
    expect(InvoiceTotals.of(draft.lines, 2_000)).toEqual({
      subtotal: 38_100,
      taxAmount: 7_620,
      total: 45_720,
    });
  });

  it('prorates a plan that started in the month, from its first day', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        subscription: { ...input().subscription, startedAt: new Date('2026-09-16T09:00:00Z') },
      }),
    );

    expect(draft.lines[0]).toMatchObject({
      description: 'Growth plan, 16–30 September (15 of 30 days)',
      amount: 14_950,
      details: { days: 15, days_in_month: 30 },
    });
    expect(draft.lines[1].amount).toBe(2_500);
  });

  it('bills nothing while a trial runs, and from the day after it ends', () => {
    const trial = (trialEndsAt: Date | null) =>
      InvoiceCalculator.calculate(
        input({ subscription: { ...input().subscription, status: 'trialing', trialEndsAt } }),
      );

    expect(trial(null).lines).toEqual([]);
    expect(trial(new Date('2026-10-15T00:00:00Z')).lines).toEqual([]);
    expect(trial(new Date('2026-09-21T00:00:00Z')).lines[0]).toMatchObject({
      description: 'Growth plan, 21–30 September (10 of 30 days)',
      amount: 9_967,
    });
  });

  it('leaves out fees that are zero and connectors there are none of', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        plan: { ...growth, platformFee: 0 },
        usage: { acConnectors: 0, dcConnectors: 3, sites: 1 },
      }),
    );

    expect(draft.lines.map((line) => line.kind)).toEqual(['dc_connector_fee']);
  });

  it('bills add-ons by their unit for their days, in the plan currency only', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        addons: [
          {
            key: 'load_management',
            name: 'Load management',
            currency: 'USD',
            price: 300,
            pricingUnit: 'per_connector',
            from: new Date('2026-09-11T00:00:00Z'),
            to: null,
          },
          {
            key: 'messaging_charging',
            name: 'Messaging-app charging',
            currency: 'USD',
            price: 4_900,
            pricingUnit: 'per_tenant',
            from: new Date('2026-01-01T00:00:00Z'),
            to: null,
          },
          {
            key: 'other',
            name: 'Other',
            currency: 'EUR',
            price: 100,
            pricingUnit: 'per_site',
            from: new Date('2026-01-01T00:00:00Z'),
            to: null,
          },
        ],
      }),
    );

    expect(draft.lines.filter((line) => line.kind === 'addon')).toEqual([
      expect.objectContaining({
        description: 'Load management add-on, 11–30 September (20 of 30 days)',
        quantity: 7,
        unitPrice: 300,
        amount: 1_400,
        details: expect.objectContaining({ module_key: 'load_management' }),
      }),
      expect.objectContaining({ description: 'Messaging-app charging add-on', amount: 4_900 }),
    ]);
    expect(draft.remarks).toEqual([
      'The Other add-on is priced in EUR and the plan in USD; it was left out.',
    ]);
  });

  it('bills the managed service fee for the days the agreement was in force', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        managedServices: [
          {
            reference: 'MSA-001',
            monthlyFee: 25_000,
            from: new Date('2026-08-01T00:00:00Z'),
            to: new Date('2026-09-15T12:00:00Z'),
          },
          { reference: '', monthlyFee: 0, from: new Date('2026-09-16T00:00:00Z'), to: null },
        ],
      }),
    );

    expect(draft.lines.filter((line) => line.kind === 'managed_service')).toEqual([
      expect.objectContaining({
        description: 'Managed service (MSA-001), 1–15 September (15 of 30 days)',
        amount: 12_500,
      }),
    ]);
  });

  it('takes the plan’s share of the month’s charging revenue, in the plan currency', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        plan: {
          ...growth,
          platformFee: 0,
          acConnectorFee: 0,
          dcConnectorFee: 0,
          revenueShareBps: 500,
        },
        revenue: [
          { currency: 'USD', gross: 123_456, sessions: 41 },
          { currency: 'EUR', gross: 5_000, sessions: 2 },
          { currency: 'GBP', gross: 0, sessions: 0 },
        ],
      }),
    );

    expect(draft.lines).toEqual([
      {
        kind: 'revenue_share',
        description: '5 % of charging revenue, USD 1,234.56 from 41 sessions',
        quantity: 1,
        unitPrice: null,
        amount: 6_173,
        details: { revenue_gross: 123_456, sessions: 41, revenue_share_bps: 500 },
      },
    ]);
    expect(draft.remarks).toEqual([
      'Charging revenue of EUR 50.00 from 2 sessions was left out of the revenue share: the plan is billed in USD.',
    ]);
  });

  it('bills nothing for a cancelled subscription', () => {
    const draft = InvoiceCalculator.calculate(
      input({ subscription: { ...input().subscription, status: 'cancelled' } }),
    );

    expect(draft.lines).toEqual([]);
  });
});
