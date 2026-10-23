import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { PaymentsFixture } from './payments.fixture';

/** A driver's paid charge end to end: the hold, the start, a refused card, and what staff see. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Public charges', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let providerAccountId: string;
  let chargeKey: string;
  let paidSessionId: string;

  beforeAll(async () => {
    await fixture.start();
    providerAccountId = await fixture.connectedAccount();
  });
  afterAll(() => fixture.stop());

  it('puts a hold on the card and sends RemoteStart once the hold is confirmed', async () => {
    const start = await api.call('POST', '/v1/public/charges', {
      body: { charger_identity: 'cp-pay-1', ocpp_connector_id: 1 },
    });
    expect(start.statusCode).toBe(201);
    expect(start.json()).toMatchObject({
      session_status: 'authorising',
      payment_status: 'pending',
      charger_identity: 'CP-PAY-1',
      connector_label: 'A',
      currency: 'GBP',
      hold_amount: 5000,
      publishable_key: 'pk_test_fake',
      provider_account_id: providerAccountId,
    });
    expect(start.json().client_secret).toMatch(/_secret$/);
    chargeKey = start.json().charge_key;
    paidSessionId = start.json().session_id;
    expect((await fixture.startCharge(1)).json()).toMatchObject({ code: 'connector_busy' });

    const providerPaymentId = [...api.gateway.holds.keys()][0];
    api.gateway.confirm(providerPaymentId);
    const checked = await api.call('POST', `/v1/public/charges/${chargeKey}/check`);
    expect(checked.json()).toMatchObject({
      session_status: 'starting',
      payment_status: 'authorised',
      card_brand: 'visa',
      card_last4: '4242',
      client_secret: null,
    });

    const { rows } = await api.data.sql(
      `select c.action, c.status, c.payload->>'id_tag' as id_tag, s.id_tag as session_tag
       from charger_commands c join charging_sessions s on s.command_id = c.id where s.id = $1`,
      [paidSessionId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'remote_start', status: 'queued' });
    expect(rows[0]['id_tag']).toBe(rows[0]['session_tag']);

    const event = {
      id: 'evt_2',
      type: 'payment_intent.amount_capturable_updated',
      account: providerAccountId,
      object_id: providerPaymentId,
    };
    expect((await fixture.webhook(event)).json()).toEqual({ outcome: 'processed' });
    expect((await api.call('GET', `/v1/public/charges/${chargeKey}`)).json()).toMatchObject({
      session_status: 'starting',
      payment_status: 'authorised',
    });
    expect((await api.call('GET', '/v1/public/charges/not-a-key')).statusCode).toBe(404);
  });

  it('ends the session as not started when the card is declined', async () => {
    const start = await fixture.startCharge(2);
    const providerPaymentId = [...api.gateway.holds.keys()].at(-1) as string;
    api.gateway.decline(providerPaymentId, 'Insufficient funds.');

    const checked = await api.call('POST', `/v1/public/charges/${start.json().charge_key}/check`);

    expect(checked.json()).toMatchObject({
      session_status: 'not_started',
      payment_status: 'failed',
      failure_message: 'Insufficient funds.',
    });
    const session = await api.call(
      'GET',
      `/v1/sessions/${start.json().session_id}`,
      fixture.asOwner(),
    );
    expect(session.json()).toMatchObject({ status: 'not_started', failure_reason: 'declined' });
    expect(session.json().state_changes.map((change: { event: string }) => change.event)).toEqual([
      'hold_requested',
      'declined',
    ]);
  });

  it('lists payments at the caller’s sites and shows the payment on its session', async () => {
    const all = await api.call('GET', '/v1/payments', fixture.asOwner());
    expect(all.json().items.map((payment: { status: string }) => payment.status)).toEqual([
      'failed',
      'authorised',
    ]);
    expect(all.json().items[1]).toMatchObject({
      session_id: paidSessionId,
      site_name: 'Riverside',
      charger_identity: 'CP-PAY-1',
      connector_label: 'A',
      session_status: 'starting',
      card_last4: '4242',
    });
    const some = await api.call('GET', '/v1/payments?status=authorised', fixture.asOwner());
    expect(some.json().items).toHaveLength(1);
    const bad = await api.call('GET', '/v1/payments?status=sideways', fixture.asOwner());
    expect(bad.statusCode).toBe(400);

    const session = await api.call('GET', `/v1/sessions/${paidSessionId}`, fixture.asOwner());
    expect(session.json()).toMatchObject({
      is_paid: true,
      payment_status: 'authorised',
      ocpp_transaction_id: null,
      payment: { status: 'authorised', hold_amount: 5000, card_last4: '4242', refunds: [] },
    });

    const depot = await api.data.site(fixture.acme, 'Depot North');
    const token = await fixture.tokenFor('tess@acme.test', TestData.ROLE_IDS.finance, depot);
    expect((await api.call('GET', '/v1/payments', { token })).json().items).toEqual([]);
    const paymentId = all.json().items[1].id;
    expect((await api.call('GET', `/v1/payments/${paymentId}`, { token })).statusCode).toBe(404);
  });
});
