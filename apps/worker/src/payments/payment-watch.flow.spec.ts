import { TestDatabase } from '@wattwisely/db/testing';
import { LiveCostJob } from '../sessions/live-cost.job';
import { PaymentJobsFixture } from './payment-jobs.fixture';
import { SessionStartTimeoutJob } from './session-start-timeout.job';
import { WebhookRetryJob } from './webhook-retry.job';

/** The jobs that watch paid sessions: start timeouts, the auto-stop at 90%, webhook retries. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Paid session watch jobs', () => {
  const fixture = new PaymentJobsFixture();
  const { ago } = PaymentJobsFixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('gives up on a hold nobody confirms and on a charger that does not start', async () => {
    const unconfirmed = await fixture.waitingSession('authorising', 16);
    const fresh = await fixture.waitingSession('authorising', 2);
    const { rows } = await fixture.worker.data.sql(
      `insert into charger_commands (id, tenant_id, charger_id, action, status, payload, requested_by_label, queued_until)
       values (gen_random_uuid(), $1, $2, 'remote_start', 'queued', '{}', 'Driver payment', now() + interval '2 minutes')
       returning id`,
      [fixture.tenantId, fixture.place.chargerId],
    );
    const commandId = rows[0]['id'] as string;
    const notStarting = await fixture.waitingSession('starting', 3, {
      history: [{ from: 'authorising', to: 'starting', event: 'authorised', at: ago(3) }],
      commandId,
    });

    expect(await fixture.worker.app.get(SessionStartTimeoutJob).runOnce(new Date())).toBe(2);

    expect(await fixture.sessionOf(unconfirmed)).toEqual({
      status: 'not_started',
      failure_reason: 'declined',
    });
    expect(await fixture.sessionOf(fresh)).toEqual({ status: 'authorising', failure_reason: null });
    expect(await fixture.sessionOf(notStarting)).toEqual({
      status: 'not_started',
      failure_reason: 'start_timeout',
    });
    const command = await fixture.worker.row('select status from charger_commands where id = $1', [
      commandId,
    ]);
    expect(command).toEqual({ status: 'expired' });
  });

  it('asks the charger to stop once the running cost reaches 90% of a 5.00 hold, once', async () => {
    const id = await fixture.worker.sessions.create(fixture.place, {
      status: 'charging',
      tariffVersionId: fixture.versionId,
      startedAt: ago(30),
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [{ at: ago(1), meterWh: 120_000 }],
      history: [{ from: null, to: 'charging', event: 'transaction_started', at: ago(30) }],
      lastEventAt: new Date().toISOString(),
    });
    await fixture.hold(id, 500);

    expect(await fixture.worker.app.get(LiveCostJob).runOnce(new Date())).toBe(1);

    expect(await fixture.paymentOf(id)).toMatchObject({
      status: 'authorised',
      is_stop_requested: true,
    });
    const stops = () =>
      fixture.worker.data.sql(
        `select status, payload->>'session_id' as session_id from charger_commands where action = 'remote_stop'`,
      );
    expect((await stops()).rows).toEqual([{ status: 'queued', session_id: id }]);

    await fixture.worker.data.sql(
      `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, samples)
       values (gen_random_uuid(), $1, $2, $3, now(), 120500, '[]')`,
      [fixture.tenantId, fixture.place.chargerId, id],
    );
    expect(await fixture.worker.app.get(LiveCostJob).runOnce(new Date())).toBe(1);
    expect((await stops()).rows).toHaveLength(1);
  });

  it('handles a stored webhook event the API could not finish', async () => {
    const id = await fixture.waitingSession('authorising', 1);
    const providerPaymentId = await fixture.hold(id, 5000, false);
    fixture.worker.gateway.confirm(providerPaymentId);
    const body = {
      id: 'evt_retry',
      type: 'payment_intent.amount_capturable_updated',
      account: fixture.providerAccountId,
      object_id: providerPaymentId,
    };
    await fixture.worker.data.sql(
      `insert into payment_webhook_events (id, provider, event_id, type, provider_account_id, payload, attempts, next_attempt_at)
       values (gen_random_uuid(), 'fake', $1, $2, $3, $4, 1, now() - interval '1 minute')`,
      [body.id, body.type, body.account, JSON.stringify(body)],
    );

    expect(await fixture.worker.app.get(WebhookRetryJob).runOnce(new Date())).toBe(1);

    expect(await fixture.paymentOf(id)).toMatchObject({ status: 'authorised' });
    expect(await fixture.sessionOf(id)).toEqual({ status: 'starting', failure_reason: null });
    const event = await fixture.worker.row(
      'select processed_at is not null as is_processed from payment_webhook_events',
    );
    expect(event).toEqual({ is_processed: true });
    expect(await fixture.worker.app.get(WebhookRetryJob).runOnce(new Date())).toBe(0);
  });
});
