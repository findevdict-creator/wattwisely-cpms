import { BillingPeriod } from '../period/billing-period';
import { InvoiceCalculator } from './invoice-calculator';
import { InvoiceInput } from './invoice-input';

describe('RevenueShareLines', () => {
  const september = BillingPeriod.of(2026, 9);
  const input = (overrides: Partial<InvoiceInput> = {}): InvoiceInput => ({
    period: september,
    revenuePeriod: september.previous(),
    plan: {
      code: 'flex',
      name: 'Flex',
      currency: 'USD',
      platformFee: 0,
      acConnectorFee: 0,
      dcConnectorFee: 0,
      revenueShareBps: 500,
      moduleKeys: [],
    },
    subscription: {
      status: 'active',
      startedAt: new Date('2026-01-01T00:00:00Z'),
      trialEndsAt: null,
      taxRateBps: 0,
      billingName: null,
      billingEmail: null,
      billingReference: null,
    },
    usage: { acConnectors: 0, dcConnectors: 0, sites: 0 },
    addons: [],
    managedServices: [],
    revenue: [],
    ...overrides,
  });

  it('takes the plan’s share of last month’s charging revenue, in the plan currency', () => {
    const draft = InvoiceCalculator.calculate(
      input({
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
        description: '5 % of charging revenue in August 2026, USD 1,234.56 from 41 sessions',
        quantity: 1,
        unitPrice: null,
        amount: 6_173,
        details: {
          revenue_month: '2026-08',
          revenue_gross: 123_456,
          sessions: 41,
          revenue_share_bps: 500,
        },
      },
    ]);
    expect(draft.remarks).toEqual([
      'Charging revenue of EUR 50.00 from 2 sessions in August 2026 was left out of the revenue share: the plan is billed in USD.',
    ]);
  });

  it('bills no share when the plan takes none', () => {
    const draft = InvoiceCalculator.calculate(
      input({
        plan: { ...input().plan, revenueShareBps: 0 },
        revenue: [{ currency: 'USD', gross: 123_456, sessions: 41 }],
      }),
    );

    expect(draft.lines).toEqual([]);
  });
});
