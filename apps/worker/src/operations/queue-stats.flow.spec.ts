import { TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { QueueStatsJob } from './queue-stats.job';

/** Module 12: GET /metrics shows the backlog of every queue, summed over the tenants. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Queue counts for the monitoring', () => {
  const worker = new TestWorker();
  const metrics = async () => (await worker.app.inject({ method: 'GET', url: '/metrics' })).body;
  const line = (text: string, name: string) =>
    text.split('\n').find((candidate) => candidate.startsWith(name));

  beforeAll(async () => {
    await worker.start();
    for (const slug of ['acme-charging', 'volt-hotels']) {
      const tenant = await worker.data.tenant(slug);
      const site = await worker.data.site(tenant, 'Main');
      const charger = await worker.data.charger(tenant, site, `CP-${slug}`);
      await worker.notifications.alert({ tenantId: tenant, siteId: site, chargerId: charger });
      await worker.notifications.export(tenant, 'sessions', {});
      await worker.data.sql(
        `insert into notifications (id, tenant_id, kind, dedupe_key, to_address, send_after)
         values (gen_random_uuid(), $1, 'receipt', 'k', 'driver@example.test', now() - interval '10 minutes')`,
        [tenant],
      );
    }
    await worker.data.sql(
      `insert into payment_webhook_events (id, event_id, type, payload, received_at)
       values (gen_random_uuid(), 'evt_1', 'payment_intent.succeeded', '{}', now() - interval '5 minutes')`,
    );
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('answers in the Prometheus text format', async () => {
    const response = await worker.app.inject({ method: 'GET', url: '/metrics' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('process_cpu_seconds_total{service="worker"}');
  });

  it('counts e-mails, exports, webhooks and alerts over all tenants, with the oldest wait', async () => {
    await worker.app.get(QueueStatsJob).runOnce(new Date());

    const text = await metrics();
    expect(line(text, 'wattwisely_outbox_due{')).toBe('wattwisely_outbox_due{service="worker"} 2');
    expect(line(text, 'wattwisely_exports_queued{')).toBe(
      'wattwisely_exports_queued{service="worker"} 2',
    );
    expect(line(text, 'wattwisely_payment_webhook_events_pending{')).toBe(
      'wattwisely_payment_webhook_events_pending{service="worker"} 1',
    );
    expect(line(text, 'wattwisely_alerts_open{')).toBe(
      'wattwisely_alerts_open{type="charger_offline",service="worker"} 2',
    );
    const oldestMail = Number(line(text, 'wattwisely_outbox_oldest_due_seconds{')?.split(' ')[1]);
    expect(oldestMail).toBeGreaterThanOrEqual(599);
    expect(oldestMail).toBeLessThan(700);
  });
});
