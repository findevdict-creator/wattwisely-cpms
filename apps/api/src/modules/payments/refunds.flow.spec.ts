import { TestData, TestDatabase, TestSessions } from '@wattwisely/db/testing';
import { PaymentsFixture } from './payments.fixture';

/** Refunds: small ones go through at once, large ones need a second person. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Refunds', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let paymentId: string;
  let refunds: string;

  beforeAll(async () => {
    await fixture.start();
    await fixture.connectedAccount();
    const connectorId = await api.data.connector(fixture.acme, fixture.chargerId, 4);
    const sessionId = await new TestSessions(api.data).create(
      {
        tenantId: fixture.acme,
        siteId: fixture.riverside,
        chargerId: fixture.chargerId,
        connectorId,
      },
      { status: 'completed' },
    );
    paymentId = await api.payments.payment(fixture.acme, sessionId, {
      status: 'captured',
      holdAmount: 20000,
      authorizedAmount: 20000,
      capturedAmount: 15000,
    });
    refunds = `/v1/payments/${paymentId}/refunds`;
  });
  afterAll(() => fixture.stop());

  it('sends a refund up to the limit to the provider at once', async () => {
    const small = await api.call(
      'POST',
      refunds,
      fixture.asOwner({ amount: 500, reason: 'Stopped early' }),
    );

    expect(small.statusCode).toBe(201);
    expect(small.json()).toMatchObject({
      status: 'succeeded',
      amount: 500,
      requested_by_label: 'olivia <olivia@acme.test>',
    });
    expect(api.gateway.calls).toContain(`refund:500:refund:${small.json().id}`);
  });

  it('holds a large refund for a second person, who may not be the requester', async () => {
    const first = await api.call(
      'POST',
      refunds,
      fixture.asOwner({ amount: 12000, reason: 'Faulty' }),
    );
    expect(first.json()).toMatchObject({ status: 'awaiting_approval' });
    const queue = await api.call('GET', '/v1/refunds?status=awaiting_approval', fixture.asOwner());
    expect(queue.json().map((refund: { id: string }) => refund.id)).toEqual([first.json().id]);
    const cancel = await api.call(
      'POST',
      `/v1/refunds/${first.json().id}/cancel`,
      fixture.asOwner(),
    );
    expect(cancel.json()).toMatchObject({ status: 'cancelled' });

    const large = await api.call(
      'POST',
      refunds,
      fixture.asOwner({ amount: 12000, reason: 'Faulty' }),
    );
    const own = await api.call('POST', `/v1/refunds/${large.json().id}/approve`, fixture.asOwner());
    expect(own.json()).toMatchObject({ status: 403, code: 'refund_own_request' });

    const token = await fixture.tokenFor('oscar@acme.test', TestData.ROLE_IDS.owner);
    const approved = await api.call('POST', `/v1/refunds/${large.json().id}/approve`, { token });
    expect(approved.json()).toMatchObject({
      status: 'succeeded',
      approved_by_label: 'oscar <oscar@acme.test>',
    });
    const late = await api.call('POST', `/v1/refunds/${large.json().id}/cancel`, fixture.asOwner());
    expect(late.statusCode).toBe(409);

    const payment = await api.call('GET', `/v1/payments/${paymentId}`, fixture.asOwner());
    expect(payment.json()).toMatchObject({ status: 'partially_refunded', refunded_amount: 12500 });
    expect(payment.json().refunds).toHaveLength(3);
  });

  it('never refunds more than what was captured and not yet given back', async () => {
    const tooMuch = await api.call(
      'POST',
      refunds,
      fixture.asOwner({ amount: 3000, reason: 'Too much' }),
    );

    expect(tooMuch.json()).toMatchObject({ status: 422, code: 'refund_too_large' });
    const audit = await api.call('GET', '/v1/audit-log?target_type=refund', fixture.asOwner());
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual([
      'payments.refund_approved',
      'payments.refund_requested',
      'payments.refund_cancelled',
      'payments.refund_requested',
      'payments.refund_requested',
    ]);
  });
});
