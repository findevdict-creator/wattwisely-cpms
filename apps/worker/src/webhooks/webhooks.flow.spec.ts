import { TestDatabase } from '@wattwisely/db/testing';
import { WebhookSignature } from '@wattwisely/webhooks';
import { TestWebhookReceiver } from '../testing/test-webhook-receiver';
import { TestWorker } from '../testing/test-worker';
import { WebhookDeliveryJob } from './webhook-delivery.job';
import { WebhookScanJob } from './webhook-scan.job';

/** Module 16: the worker queues session and alert events per endpoint and posts them, signed, with retries. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Webhook jobs', () => {
  const worker = new TestWorker();
  const receiver = new TestWebhookReceiver();
  let acme: string;
  let place: { tenantId: string; siteId: string; chargerId: string; connectorId: string };
  let good: { id: string; secret: string };
  let failing: { id: string; secret: string };
  let sessionId: string;
  let alertId: string;
  let scan: WebhookScanJob;
  let delivery: WebhookDeliveryJob;

  beforeAll(async () => {
    await receiver.start();
    await worker.start();
    scan = worker.app.get(WebhookScanJob);
    delivery = worker.app.get(WebhookDeliveryJob);
    await setUp();
  });

  afterAll(async () => {
    await worker.stop();
    await receiver.stop();
  });

  /** Acme with three endpoints (one good, one failing, one paused) and Volt with one, listening to the same events. */
  async function setUp(): Promise<void> {
    const baseUrl = receiver.baseUrl;
    acme = await worker.data.tenant('acme-charging');
    const volt = await worker.data.tenant('volt-hotels');
    const siteId = await worker.data.site(acme, 'Riverside');
    const chargerId = await worker.data.charger(acme, siteId, 'ACME-1');
    const connectorId = await worker.data.connector(acme, chargerId, 1);
    place = { tenantId: acme, siteId, chargerId, connectorId };
    const minuteAgo = new Date(Date.now() - 60_000);
    const events = ['session.completed', 'alert.opened', 'alert.closed'];
    good = await worker.integrations.webhookEndpoint(acme, `${baseUrl}/ok`, events, {
      scannedTo: minuteAgo,
    });
    failing = await worker.integrations.webhookEndpoint(
      acme,
      `${baseUrl}/fail`,
      ['session.completed'],
      {
        scannedTo: minuteAgo,
      },
    );
    await worker.integrations.webhookEndpoint(acme, `${baseUrl}/paused`, events, {
      scannedTo: minuteAgo,
      isActive: false,
    });
    await worker.integrations.webhookEndpoint(volt, `${baseUrl}/volt`, events, {
      scannedTo: minuteAgo,
    });
  }

  /** A moment far enough ahead that rows written just now are inside the scan window. */
  function soon(): Date {
    return new Date(Date.now() + 5_000);
  }

  it('queues each event once per endpoint that listens for it, in the tenant it happened in', async () => {
    const at = new Date().toISOString();
    sessionId = await worker.sessions.create(place, {
      status: 'completed',
      startedAt: at,
      endedAt: at,
      history: [
        { from: null, to: 'charging', event: 'transaction_started', at },
        { from: 'charging', to: 'stopping', event: 'transaction_ended', at },
        { from: 'stopping', to: 'completed', event: 'priced', at },
      ],
    });
    alertId = await worker.notifications.alert(place, { title: 'ACME-1 is offline' });

    const queued = await scan.runOnce(soon());
    const again = await scan.runOnce(soon());
    const rows = await worker.data.sql(
      'select endpoint_id, event_type, status from webhook_deliveries order by created_at, event_type',
    );

    expect(queued).toBe(3);
    expect(again).toBe(0);
    expect(rows.rows).toEqual(
      expect.arrayContaining([
        { endpoint_id: good.id, event_type: 'session.completed', status: 'pending' },
        { endpoint_id: good.id, event_type: 'alert.opened', status: 'pending' },
        { endpoint_id: failing.id, event_type: 'session.completed', status: 'pending' },
      ]),
    );
    expect(rows.rows).toHaveLength(3);
  });

  it('posts each delivery signed, and records the answer on the delivery and the endpoint', async () => {
    const now = new Date();
    const sent = await delivery.runOnce(now);

    expect(sent).toBe(3);
    const toGood = receiver.at('/ok');
    expect(toGood).toHaveLength(2);
    for (const request of toGood) {
      const signature = String(request.headers['wattwisely-signature']);
      expect(request.headers['content-type']).toBe('application/json');
      expect(request.headers['user-agent']).toBe('Wattwisely-Webhooks/1.0');
      expect(WebhookSignature.verify(good.secret, signature, request.body, now)).toBe(true);
    }
    const completed = receiver.ofEvent('session.completed');
    const body = receiver.bodyOf('session.completed');
    expect(body).toMatchObject({
      type: 'session.completed',
      tenant_id: acme,
      data: { id: sessionId, status: 'completed', site_id: place.siteId, energy_wh: 22_000 },
    });
    expect(body['id']).toBe(completed?.headers['wattwisely-delivery']);
    expect(receiver.bodyOf('alert.opened')['data']).toMatchObject({
      id: alertId,
      type: 'charger_offline',
      title: 'ACME-1 is offline',
    });

    const goodRows = await worker.data.sql(
      'select status, attempts, last_status_code, last_error, delivered_at from webhook_deliveries where endpoint_id = $1',
      [good.id],
    );
    expect(goodRows.rows).toHaveLength(2);
    for (const row of goodRows.rows) {
      expect(row).toMatchObject({
        status: 'delivered',
        attempts: 1,
        last_status_code: 200,
        last_error: null,
      });
      expect(row.delivered_at).not.toBeNull();
    }
    const failedRow = await worker.row(
      'select status, attempts, last_status_code, last_error, next_attempt_at from webhook_deliveries where endpoint_id = $1',
      [failing.id],
    );
    expect(failedRow).toMatchObject({
      status: 'pending',
      attempts: 1,
      last_status_code: 500,
      last_error: 'HTTP 500',
    });
    expect((failedRow?.next_attempt_at as Date).getTime()).toBe(now.getTime() + 60_000);
    const endpoints = await worker.data.sql(
      'select id, failure_count, last_delivery_at from webhook_endpoints where id in ($1, $2)',
      [good.id, failing.id],
    );
    expect(endpoints.rows.find((row) => row.id === good.id)?.failure_count).toBe(0);
    expect(endpoints.rows.find((row) => row.id === failing.id)?.failure_count).toBe(1);
  });

  it('tries a failed delivery again on the schedule, then gives up', async () => {
    const before = receiver.at('/fail').length;

    const tooEarly = await delivery.runOnce(new Date(Date.now() + 30_000));
    const dueAgain = await delivery.runOnce(new Date(Date.now() + 61_000));
    await worker.data.sql(
      'update webhook_deliveries set attempts = 5, next_attempt_at = now() where endpoint_id = $1',
      [failing.id],
    );
    const lastTry = await delivery.runOnce(new Date());
    const row = await worker.row(
      'select status, attempts, last_error from webhook_deliveries where endpoint_id = $1',
      [failing.id],
    );
    const endpoint = await worker.row('select failure_count from webhook_endpoints where id = $1', [
      failing.id,
    ]);

    expect(tooEarly).toBe(0);
    expect(dueAgain).toBe(1);
    expect(lastTry).toBe(1);
    expect(receiver.at('/fail')).toHaveLength(before + 2);
    expect(row).toEqual({ status: 'failed', attempts: 6, last_error: 'HTTP 500' });
    expect(endpoint?.failure_count).toBe(3);
  });

  it('sends the alert’s closing as its own event, and records an endpoint that cannot be reached', async () => {
    // The earlier scans ran a few seconds "ahead"; the closing has to land after their mark.
    await worker.data.sql(
      `update alerts set status = 'closed', closed_at = now() + interval '10 seconds', close_reason = 'cleared' where id = $1`,
      [alertId],
    );
    const unreachable = await worker.integrations.webhookEndpoint(
      acme,
      'http://127.0.0.1:65531/hook',
      ['alert.closed'],
      { scannedTo: new Date(Date.now() - 60_000) },
    );

    const queued = await scan.runOnce(new Date(Date.now() + 20_000));
    const sent = await delivery.runOnce(new Date());
    const row = await worker.row(
      'select status, attempts, last_status_code, last_error from webhook_deliveries where endpoint_id = $1',
      [unreachable.id],
    );

    expect(queued).toBe(2);
    expect(sent).toBe(2);
    expect(receiver.bodyOf('alert.closed')['data']).toMatchObject({
      id: alertId,
      status: 'closed',
      close_reason: 'cleared',
    });
    expect(row).toMatchObject({ status: 'pending', attempts: 1, last_status_code: null });
    expect(row?.last_error).toMatch(/ECONNREFUSED/);
  });
});
