import { SessionPlace, TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { LiveCostJob } from './live-cost.job';
import { SessionFinaliseJob } from './session-finalise.job';
import { StaleSessionSweepJob } from './stale-session-sweep.job';

/** The worker's three session jobs against a real database. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Session jobs', () => {
  const worker = new TestWorker();
  let place: SessionPlace;
  let versionId: string;

  beforeAll(async () => {
    await worker.start();
    const tenantId = await worker.data.tenant('acme-charging');
    const siteId = await worker.data.site(tenantId, 'Riverside');
    const chargerId = await worker.data.charger(tenantId, siteId, 'WW-JOBS');
    const connectorId = await worker.data.connector(tenantId, chargerId, 1, 50);
    place = { tenantId, siteId, chargerId, connectorId };
    versionId = (await worker.tariffs.create(tenantId, 'Standard')).versionId;
  });

  afterAll(async () => {
    await worker.stop();
  });

  const statusOf = (id: string) =>
    worker.row(
      'select status, gross_amount::int, tax_amount::int, failure_reason from charging_sessions where id = $1',
      [id],
    );

  it('prices a stopped session once the car has left, and announces it', async () => {
    const id = await worker.sessions.create(place, { tariffVersionId: versionId });
    const waiting = await worker.sessions.create(place, {
      tariffVersionId: versionId,
      endedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      unpluggedAt: null,
      lastEventAt: new Date().toISOString(),
    });

    const changed = await worker.app.get(SessionFinaliseJob).runOnce(new Date());

    expect(changed).toBe(1);
    expect(await statusOf(id)).toEqual({
      status: 'completed',
      gross_amount: 880,
      tax_amount: 147,
      failure_reason: null,
    });
    expect((await statusOf(waiting))?.['status']).toBe('stopping');
    const announced = await worker.eventsOf('session.updated');
    expect(announced.map((event) => event.data)).toContainEqual(
      expect.objectContaining({
        session_id: id,
        status: 'completed',
        gross_amount: 880,
        currency: 'GBP',
      }),
    );
  });

  it('keeps the running cost of a charging session up to date', async () => {
    const startedAt = new Date(Date.now() - 30 * 60_000);
    const id = await worker.sessions.create(place, {
      status: 'charging',
      tariffVersionId: versionId,
      startedAt: startedAt.toISOString(),
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [{ at: new Date(Date.now() - 60_000).toISOString(), meterWh: 110_000 }],
      history: [
        { from: null, to: 'charging', event: 'transaction_started', at: startedAt.toISOString() },
      ],
      lastEventAt: new Date().toISOString(),
    });

    const job = worker.app.get(LiveCostJob);
    expect(await job.runOnce(new Date())).toBe(1);
    expect(await job.runOnce(new Date())).toBe(0);

    const session = await statusOf(id);
    expect(session?.['status']).toBe('charging');
    expect(session?.['gross_amount']).toBeGreaterThanOrEqual(300);
    const announced = await worker.eventsOf('session.cost_updated');
    expect(announced.map((event) => event.data['session_id'])).toEqual([id]);
  });

  it('closes a session that has been silent for a day as failed', async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
    const id = await worker.sessions.create(place, {
      status: 'charging',
      tariffVersionId: versionId,
      startedAt: twoDaysAgo,
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [],
      history: [{ from: null, to: 'charging', event: 'transaction_started', at: twoDaysAgo }],
      lastEventAt: twoDaysAgo,
    });

    expect(await worker.app.get(StaleSessionSweepJob).runOnce(new Date())).toBe(1);

    expect(await statusOf(id)).toEqual({
      status: 'failed',
      gross_amount: null,
      tax_amount: null,
      failure_reason: 'stale',
    });
  });
});
