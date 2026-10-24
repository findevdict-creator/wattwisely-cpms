import { BillingPeriod } from '@wattwisely/billing';
import { TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { InvoiceDraftJob } from './invoice-draft.job';
import { InvoiceOverdueJob } from './invoice-overdue.job';

/** Module 15: on the 1st the worker drafts last month's invoices; an unpaid invoice marks the subscription past due. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Billing jobs', () => {
  const worker = new TestWorker();
  const now = new Date();
  const lastMonth = BillingPeriod.before(now);
  const threeMonthsAgo = new Date(now.getTime() - 92 * 86_400_000);
  let acme: string;
  let flex: string;
  let volt: string;
  let acmeSubscription: string;

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
    flex = await worker.data.tenant('flex-ops');
    volt = await worker.data.tenant('volt-hotels');
    acmeSubscription = await worker.platform.subscription(
      acme,
      TestPlatform.PLAN_IDS.growth,
      'active',
      {
        startedAt: threeMonthsAgo,
        taxRateBps: 2_000,
        billingEmail: 'accounts@acme.test',
      },
    );
    await worker.platform.subscription(flex, TestPlatform.PLAN_IDS.flex, 'active', {
      startedAt: threeMonthsAgo,
    });
    await worker.platform.subscription(volt, TestPlatform.PLAN_IDS.starter, 'trialing', {
      startedAt: threeMonthsAgo,
      trialEndsAt: new Date(now.getTime() + 30 * 86_400_000),
    });
    await worker.platform.entitlement(acme, 'load_management', 'addon');
    await worker.data.sql('update tenant_entitlements set created_at = $1 where tenant_id = $2', [
      threeMonthsAgo,
      acme,
    ]);
    const manager = await worker.data.person('ana@wattwisely.test', 'Ana');
    const staffId = await worker.platform.staff(manager, 'admin');
    await worker.managed.service(acme, staffId, 'active', {
      acceptedAt: threeMonthsAgo,
      monthlyFee: 25_000,
    });
    await equipment();
  });

  afterAll(async () => {
    await worker.stop();
  });

  /** Acme: two AC and one DC connector. Flex: one charger with a completed session last month. */
  async function equipment(): Promise<void> {
    const acmeSite = await worker.data.site(acme, 'Riverside');
    const acmeCharger = await worker.data.charger(acme, acmeSite, 'ACME-1');
    for (const connector of [1, 2, 3]) {
      const id = await worker.data.connector(acme, acmeCharger, connector);
      await worker.data.sql('update connectors set current_type = $2 where id = $1', [
        id,
        connector === 3 ? 'dc' : 'ac',
      ]);
    }
    const flexSite = await worker.data.site(flex, 'Depot');
    const flexCharger = await worker.data.charger(flex, flexSite, 'FLEX-1');
    const connectorId = await worker.data.connector(flex, flexCharger, 1);
    const startedAt = new Date(lastMonth.from.getTime() + 5 * 86_400_000).toISOString();
    const session = await worker.sessions.create(
      { tenantId: flex, siteId: flexSite, chargerId: flexCharger, connectorId },
      { status: 'completed', startedAt, endedAt: startedAt, createdAt: startedAt },
    );
    await worker.data.sql(
      `update charging_sessions set currency = 'USD', gross_amount = 20000, net_amount = 20000, tax_amount = 0 where id = $1`,
      [session],
    );
  }

  it('drafts last month’s invoice once for every tenant with something to bill', async () => {
    const job = worker.app.get(InvoiceDraftJob);

    expect(await job.runOnce(now)).toBe(2);
    expect(await job.runOnce(now)).toBe(0);

    const { rows: invoices } = await worker.data.sql(
      `select tenant_id, status, period_start::text, currency, subtotal::int, tax_rate_bps, tax_amount::int, total::int, billing_email
       from invoices order by created_at`,
    );
    expect(invoices).toEqual([
      {
        tenant_id: acme,
        status: 'draft',
        period_start: lastMonth.firstDay,
        currency: 'USD',
        subtotal: 29_900 + 2_000 + 1_600 + 900 + 25_000,
        tax_rate_bps: 2_000,
        tax_amount: 11_880,
        total: 71_280,
        billing_email: 'accounts@acme.test',
      },
      {
        tenant_id: flex,
        status: 'draft',
        period_start: lastMonth.firstDay,
        currency: 'USD',
        subtotal: 1_000,
        tax_rate_bps: 0,
        tax_amount: 0,
        total: 1_000,
        billing_email: null,
      },
    ]);
    const { rows: lines } = await worker.data.sql(
      `select kind, description, quantity::float, unit_price, amount::int from invoice_lines l
       join invoices i on i.id = l.invoice_id where i.tenant_id = $1 order by position`,
      [acme],
    );
    expect(lines).toEqual([
      {
        kind: 'platform_fee',
        description: 'Growth plan',
        quantity: 1,
        unit_price: 29_900,
        amount: 29_900,
      },
      {
        kind: 'ac_connector_fee',
        description: 'AC connectors',
        quantity: 2,
        unit_price: 1_000,
        amount: 2_000,
      },
      {
        kind: 'dc_connector_fee',
        description: 'DC connectors',
        quantity: 1,
        unit_price: 1_600,
        amount: 1_600,
      },
      {
        kind: 'addon',
        description: 'Load management add-on',
        quantity: 3,
        unit_price: 300,
        amount: 900,
      },
      {
        kind: 'managed_service',
        description: 'Managed service',
        quantity: 1,
        unit_price: 25_000,
        amount: 25_000,
      },
    ]);
    const { rows: flexLines } = await worker.data.sql(
      `select kind, description, amount::int from invoice_lines where tenant_id = $1`,
      [flex],
    );
    expect(flexLines).toEqual([
      {
        kind: 'revenue_share',
        description: '5 % of charging revenue, USD 200.00 from 1 sessions',
        amount: 1_000,
      },
    ]);
  });

  it('marks a subscription past due while an issued invoice is overdue, and active again once it is paid', async () => {
    const job = worker.app.get(InvoiceOverdueJob);
    const overdue = await worker.billing.invoice(acme, {
      month: lastMonth.previous().key,
      dueAt: new Date(now.getTime() - 86_400_000),
    });
    await worker.billing.invoice(flex, { month: lastMonth.previous().key });

    expect(await job.runOnce(now)).toBe(1);
    expect(await job.runOnce(now)).toBe(0);
    expect(
      await worker.row('select status, version from tenant_subscriptions where id = $1', [
        acmeSubscription,
      ]),
    ).toEqual({ status: 'past_due', version: 2 });
    expect(
      await worker.row(
        `select action, actor_label, target_label from audit_log where tenant_id = $1 and action like 'subscription.%'`,
        [acme],
      ),
    ).toEqual({
      action: 'subscription.past_due',
      actor_label: 'Wattwisely (automatic)',
      target_label: 'acme-charging',
    });

    await worker.data.sql(`update invoices set status = 'paid', paid_at = now() where id = $1`, [
      overdue,
    ]);
    expect(await job.runOnce(now)).toBe(1);
    expect(
      await worker.row('select status from tenant_subscriptions where id = $1', [acmeSubscription]),
    ).toEqual({ status: 'active' });
    expect(
      await worker.row(
        `select count(*)::int as changes from audit_log where tenant_id = $1 and action like 'subscription.%'`,
        [acme],
      ),
    ).toEqual({ changes: 2 });
  });
});
