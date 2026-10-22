import { TestDatabase } from '@wattwisely/db/testing';
import { SessionFinaliseJob } from '../sessions/session-finalise.job';
import { PaymentJobsFixture } from './payment-jobs.fixture';
import { PaymentSettleJob } from './payment-settle.job';

/** PaymentSettleJob against a real database, with the provider in memory. */
(TestDatabase.isConfigured() ? describe : describe.skip)('PaymentSettleJob', () => {
  const fixture = new PaymentJobsFixture();
  const settle = () => fixture.worker.app.get(PaymentSettleJob).runOnce(new Date());
  const finalise = () => fixture.worker.app.get(SessionFinaliseJob).runOnce(new Date());

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('captures the final price once a paid session is priced, never before', async () => {
    const id = await fixture.worker.sessions.create(fixture.place, {
      tariffVersionId: fixture.versionId,
    });
    const providerPaymentId = await fixture.hold(id);
    expect(await settle()).toBe(0);

    expect(await finalise()).toBe(1);
    expect(await settle()).toBe(1);

    expect(await fixture.paymentOf(id)).toMatchObject({
      status: 'captured',
      captured_amount: 880,
      review_flags: [],
    });
    expect(fixture.worker.gateway.calls).toContain(`capture:880:capture:${id}`);
    expect(fixture.worker.gateway.holds.get(providerPaymentId)).toMatchObject({
      status: 'captured',
      amountCaptured: 880,
    });
    expect(await settle()).toBe(0);
  });

  it('captures the whole hold and flags the payment when the price went above it', async () => {
    const id = await fixture.worker.sessions.create(fixture.place, {
      tariffVersionId: fixture.versionId,
    });
    await fixture.hold(id, 500);

    await finalise();
    await settle();

    expect(await fixture.paymentOf(id)).toMatchObject({
      status: 'captured',
      captured_amount: 500,
      review_flags: ['capture_above_hold'],
    });
  });

  it('releases the hold of a session that never delivered a price', async () => {
    const id = await fixture.waitingSession('failed', 5);
    await fixture.worker.data.sql(
      `update charging_sessions set closed_at = now(), failure_reason = 'start_timeout' where id = $1`,
      [id],
    );
    await fixture.hold(id);

    expect(await settle()).toBe(1);

    expect(await fixture.paymentOf(id)).toMatchObject({
      status: 'released',
      captured_amount: null,
    });
    expect(fixture.worker.gateway.calls).toContain(`cancel:cancel:${id}`);
  });
});
