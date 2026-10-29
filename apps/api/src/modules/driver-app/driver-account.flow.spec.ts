import { TestDatabase } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 33: the driver's receipt as a PDF, their data as one file, and deleting the account.
 * Deleting forgets the cards, blanks the guest record the app made and unlinks the record the
 * operator made; the next request with the same login starts a new, empty account.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver account', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;
  let sessionId = '';

  beforeAll(async () => {
    await stage.start();
    await stage.saveCard(stage.danaToken);
    await stage.saveCard(stage.guyToken);
    sessionId = (await stage.startCharge(stage.danaToken, 1)).json().id;
  });
  afterAll(() => stage.stop());

  it('makes the receipt PDF once the charge is priced, for its driver only', async () => {
    const url = `/v1/driver/charges/${sessionId}/receipt.pdf`;
    expect((await api.call('GET', url, { token: stage.danaToken })).json().code).toBe(
      'receipt_not_ready',
    );
    await api.data.sql(
      `update charging_sessions set status = 'completed', ended_at = now(), priced_at = now(),
         energy_wh = 10000, net_amount = 244, tax_amount = 56, gross_amount = 300 where id = $1`,
      [sessionId],
    );
    await api.data.sql(
      `insert into session_line_items (id, tenant_id, session_id, position, kind, band_name, quantity, unit, unit_price, net, tax, gross)
       select gen_random_uuid(), tenant_id, id, 1, 'energy', 'off-peak', 10000, 'wh', 3000, 244, 56, 300
       from charging_sessions where id = $1`,
      [sessionId],
    );
    const pdf = await api.call('GET', url, { token: stage.danaToken });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await api.call('GET', url, { token: stage.guyToken })).statusCode).toBe(404);
  });

  it('exports the account, what the operator keeps, the cards and the charges', async () => {
    const data = await api.call('GET', '/v1/driver/me/export', { token: stage.danaToken });
    expect(data.headers['content-disposition']).toContain('my-wattwisely-data.json');
    expect(data.json()).toMatchObject({
      account: { email: 'dana@example.com' },
      operators: [
        { operator_name: 'acme charging', driver_name: 'Dana Driver', reference: 'EMP-42' },
      ],
      cards: [{ brand: 'visa', last4: '4242' }],
      charges: [{ id: sessionId }],
    });
  });

  it('deletes the account: cards, the guest record and the link go, the operator’s record stays', async () => {
    expect((await stage.startCharge(stage.guyToken, 3, true)).statusCode).toBe(201);
    expect((await api.call('DELETE', '/v1/driver/me', { token: stage.guyToken })).statusCode).toBe(
      204,
    );
    expect(api.gateway.calls).toContain('deleteCustomer');
    const guest = await api.data.sql(
      `select name, email, driver_account_id from drivers where tenant_id = $1 and is_guest`,
      [stage.acme],
    );
    expect(guest.rows).toEqual([{ name: 'Deleted driver', email: null, driver_account_id: null }]);
    const audit = await api.data.sql(
      `select target_label, before from audit_log where action = 'drivers.guest_record_erased'`,
    );
    expect(audit.rows).toEqual([{ target_label: 'Deleted driver', before: null }]);

    expect((await api.call('DELETE', '/v1/driver/me', { token: stage.danaToken })).statusCode).toBe(
      204,
    );
    const member = await api.data.sql(
      `select name, email, driver_account_id from drivers where id = $1`,
      [stage.danaDriverId],
    );
    expect(member.rows).toEqual([
      { name: 'Dana Driver', email: 'dana@example.com', driver_account_id: null },
    ]);
    const accounts = await api.data.sql(
      `select count(*)::int as people from driver_accounts where email not like 'deleted-%@deleted.invalid'`,
    );
    expect(accounts.rows).toEqual([{ people: 0 }]);
    const cards = await api.data.sql(`select distinct status from payment_methods`);
    expect(cards.rows).toEqual([{ status: 'removed' }]);

    const again = await api.call('GET', '/v1/driver/operators', { token: stage.danaToken });
    expect(again.json().items).toEqual([]);
  });
});
