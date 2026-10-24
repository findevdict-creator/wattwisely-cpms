import { InvoicesFixture } from './invoices.fixture';

/** Module 15: what staff may do to a draft, who may do it, and the months that cannot be drafted. */
(InvoicesFixture.isConfigured() ? describe : describe.skip)('Invoice drafts', () => {
  const fixture = new InvoicesFixture();
  const { api } = fixture;
  const month = () => fixture.lastMonth.previous().key;
  let invoiceId: string;
  let version: number;

  beforeAll(async () => {
    await fixture.start();
    const draft = await fixture.draft(month());
    invoiceId = draft.id;
    version = draft.version;
  });
  afterAll(() => fixture.stop());

  it('refuses the current month, a month that is not one, and a tenant without a plan', async () => {
    const url = `/v1/admin/tenants/${fixture.acme}/invoices`;
    const thisMonth = fixture.now.toISOString().slice(0, 7);
    const current = await api.call('POST', url, fixture.asAdmin({ month: thisMonth }));
    const nonsense = await api.call('POST', url, fixture.asAdmin({ month: '2026-13' }));
    const noPlan = await api.call(
      'POST',
      `/v1/admin/tenants/${await api.data.tenant('new-co')}/invoices`,
      fixture.asAdmin({ month: month() }),
    );
    const asViewer = await api.call('POST', url, fixture.asViewer({ month: month() }));

    expect(current.statusCode).toBe(422);
    expect(current.json()).toMatchObject({ code: 'invoice_month_not_over' });
    expect(nonsense.statusCode).toBe(400);
    expect(noPlan.statusCode).toBe(409);
    expect(noPlan.json()).toMatchObject({ code: 'plan_missing' });
    expect(asViewer.statusCode).toBe(403);
  });

  it('takes an adjustment line, a credit here, and works the totals out again', async () => {
    const added = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/lines`,
      fixture.asAdmin(
        { description: 'Credit for the outage on the 12th', amount: -5_000 },
        version,
      ),
    );
    const asViewer = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/lines`,
      fixture.asViewer({ description: 'x', amount: 1 }, added.json().version),
    );

    expect(added.statusCode).toBe(201);
    expect(added.json()).toMatchObject({
      subtotal: 54_400,
      tax_amount: 10_880,
      total: 65_280,
      version: 2,
    });
    expect(added.json().lines.at(-1)).toMatchObject({
      kind: 'adjustment',
      description: 'Credit for the outage on the 12th',
      amount: -5_000,
    });
    expect(asViewer.statusCode).toBe(403);
    version = added.json().version;
  });

  it('works the fee lines out again after the tax rate changed, keeping the adjustment', async () => {
    await api.data.sql('update tenant_subscriptions set tax_rate_bps = 0 where id = $1', [
      fixture.subscriptionId,
    ]);
    const regenerated = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/regenerate`,
      fixture.asAdmin({}, version),
    );

    expect(regenerated.statusCode).toBe(200);
    expect(regenerated.json()).toMatchObject({
      subtotal: 54_400,
      tax_rate_bps: 0,
      tax_amount: 0,
      total: 54_400,
      version: 3,
    });
    expect(regenerated.json().lines.map((line: { kind: string }) => line.kind)).toEqual([
      'platform_fee',
      'ac_connector_fee',
      'dc_connector_fee',
      'addon',
      'managed_service',
      'adjustment',
    ]);
    version = regenerated.json().version;
  });

  it('drops a line, and refuses one that is not on the invoice', async () => {
    const lines = (
      await api.call('GET', `/v1/admin/invoices/${invoiceId}`, fixture.asAdmin())
    ).json().lines as { id: string; kind: string }[];
    const managed = lines.find((line) => line.kind === 'managed_service') as { id: string };
    const removed = await api.call(
      'DELETE',
      `/v1/admin/invoices/${invoiceId}/lines/${managed.id}`,
      fixture.asAdmin(undefined, version),
    );
    const missing = await api.call(
      'DELETE',
      `/v1/admin/invoices/${invoiceId}/lines/${managed.id}`,
      fixture.asAdmin(undefined, removed.json().version),
    );

    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toMatchObject({ subtotal: 29_400, total: 29_400, version: 4 });
    expect(removed.json().lines).toHaveLength(5);
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'invoice_line_not_found' });
    version = removed.json().version;
  });

  it('is voided with a reason, after which the month can be drafted again', async () => {
    const voided = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/void`,
      fixture.asAdmin({ reason: 'Drafted against the wrong plan' }, version),
    );
    const changed = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/lines`,
      fixture.asAdmin({ description: 'x', amount: 1 }, voided.json().version),
    );
    const redrafted = await fixture.draft(month());
    const voidList = await api.call('GET', '/v1/admin/invoices?status=void', fixture.asAdmin());

    expect(voided.statusCode).toBe(200);
    expect(voided.json()).toMatchObject({
      status: 'void',
      void_reason: 'Drafted against the wrong plan',
      voided_at: expect.any(String),
    });
    expect(changed.statusCode).toBe(409);
    expect(redrafted).toMatchObject({ status: 'draft', month: month(), total: 59_400 });
    expect(voidList.json().items.map((item: { id: string }) => item.id)).toEqual([invoiceId]);
    expect(await fixture.auditActions()).toEqual([
      'admin.invoice_drafted',
      'admin.invoice_changed',
      'admin.invoice_changed',
      'admin.invoice_changed',
      'admin.invoice_voided',
      'admin.invoice_drafted',
    ]);
  });
});
