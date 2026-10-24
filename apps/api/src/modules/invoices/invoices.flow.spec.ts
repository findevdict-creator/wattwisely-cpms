import { InvoicesFixture } from './invoices.fixture';

/** Module 15: staff draft, issue and settle an invoice; the tenant's Owner reads it. */
(InvoicesFixture.isConfigured() ? describe : describe.skip)('Invoices', () => {
  const fixture = new InvoicesFixture();
  const { api } = fixture;
  let invoiceId: string;
  let version: number;
  let number: string;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('drafts last month’s invoice from the plan, the connectors, the add-on and the managed service', async () => {
    const draft = await fixture.draft();
    invoiceId = draft.id;
    version = draft.version;

    expect(draft).toMatchObject({
      tenant_slug: 'acme-charging',
      status: 'draft',
      number: null,
      month: fixture.lastMonth.key,
      month_label: fixture.lastMonth.label,
      currency: 'USD',
      subtotal: 59_400,
      tax_rate_bps: 2_000,
      tax_amount: 11_880,
      total: 71_280,
      billing_email: 'accounts@acme.test',
      is_overdue: false,
      version: 1,
    });
    expect(
      draft.lines.map((line: { kind: string; amount: number }) => [line.kind, line.amount]),
    ).toEqual([
      ['platform_fee', 29_900],
      ['ac_connector_fee', 2_000],
      ['dc_connector_fee', 1_600],
      ['addon', 900],
      ['managed_service', 25_000],
    ]);
    expect(draft.lines[3].description).toBe('Load management add-on');
    expect(await fixture.auditActions()).toEqual(['admin.invoice_drafted']);
  });

  it('keeps a draft from the tenant, lists it for staff, and refuses a second one for the month', async () => {
    const mine = await api.call('GET', '/v1/invoices', fixture.asOwner());
    const one = await api.call('GET', `/v1/invoices/${invoiceId}`, fixture.asOwner());
    const staffList = await api.call('GET', '/v1/admin/invoices?status=draft', fixture.asAdmin());
    const byTenant = await api.call(
      'GET',
      `/v1/admin/invoices?tenant_id=${fixture.acme}&month=${fixture.lastMonth.key}`,
      fixture.asViewer(),
    );
    const again = await api.call(
      'POST',
      `/v1/admin/tenants/${fixture.acme}/invoices`,
      fixture.asAdmin({ month: fixture.lastMonth.key }),
    );

    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toEqual([]);
    expect(one.statusCode).toBe(404);
    expect(staffList.json().items.map((item: { id: string }) => item.id)).toEqual([invoiceId]);
    expect(byTenant.json().items).toHaveLength(1);
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: 'invoice_exists' });
  });

  it('issues the draft with a number, due in 30 days, and e-mails the billing contact', async () => {
    const stale = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/issue`,
      fixture.asAdmin({}, 9),
    );
    const issued = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/issue`,
      fixture.asAdmin({}, version),
    );
    const twice = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/issue`,
      fixture.asAdmin({}, issued.json().invoice?.version),
    );

    expect(stale.statusCode).toBe(409);
    expect(issued.statusCode).toBe(200);
    const { invoice } = issued.json();
    number = invoice.number;
    version = invoice.version;
    expect(issued.json().is_email_sent).toBe(true);
    expect(invoice).toMatchObject({ status: 'issued', billing_name: 'Acme', version: 2 });
    expect(number).toMatch(/^WW-\d{4}-0001$/);
    expect(new Date(invoice.due_at).getTime() - new Date(invoice.issued_at).getTime()).toBe(
      30 * 86_400_000,
    );
    expect(twice.statusCode).toBe(409);
    expect(twice.json()).toMatchObject({ code: 'invoice_status_conflict' });
    expect(fixture.billingMails()).toEqual([
      `Invoice ${number} from Wattwisely: USD 712.80, due by ${invoice.due_at.slice(0, 10)}`,
    ]);
    const mail = fixture.api.mail.sent[0];
    expect(mail.html).toContain(`http://portal.test/settings/invoices/${invoiceId}`);
    expect(mail.text).toContain('including 20 % tax, USD 118.80');
  });

  it('shows the issued invoice to those with invoices:read, and nothing to a Technician', async () => {
    const mine = await api.call('GET', '/v1/invoices', fixture.asOwner());
    const one = await api.call('GET', `/v1/invoices/${invoiceId}`, fixture.asOwner());
    const refused = await api.call('GET', '/v1/invoices', fixture.asTechnician());

    expect(mine.json()).toEqual([
      expect.objectContaining({ id: invoiceId, number, status: 'issued' }),
    ]);
    expect(one.json()).toMatchObject({ number, lines: expect.any(Array), total: 71_280 });
    expect(one.json().lines).toHaveLength(5);
    expect(refused.statusCode).toBe(403);
  });

  it('is marked paid with a reference, which closes it for good', async () => {
    const paid = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/pay`,
      fixture.asAdmin({ payment_reference: 'TRF 4711' }, version),
    );
    const voided = await api.call(
      'POST',
      `/v1/admin/invoices/${invoiceId}/void`,
      fixture.asAdmin({ reason: 'Too late' }, paid.json().version),
    );
    const paidList = await api.call('GET', '/v1/admin/invoices?status=paid', fixture.asAdmin());

    expect(paid.statusCode).toBe(200);
    expect(paid.json()).toMatchObject({
      status: 'paid',
      payment_reference: 'TRF 4711',
      paid_at: expect.any(String),
      version: 3,
    });
    expect(voided.statusCode).toBe(409);
    expect(paidList.json().items.map((item: { number: string }) => item.number)).toEqual([number]);
    expect(await fixture.auditActions()).toEqual([
      'admin.invoice_drafted',
      'admin.invoice_issued',
      'admin.invoice_paid',
    ]);
  });
});
