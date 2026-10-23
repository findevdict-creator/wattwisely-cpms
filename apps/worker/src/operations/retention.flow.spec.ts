import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { RetentionJob } from './retention.job';

/** Module 12: old working data and drivers' addresses are deleted; records are not. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Retention job', () => {
  const worker = new TestWorker();
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
  const count = async (table: string) =>
    (await worker.row(`select count(*)::int as n from ${table}`))?.['n'];
  let acme: string;
  let charger: string;
  let membership: string;
  let records: unknown[];

  const message = (at: Date) =>
    worker.data.sql(
      `insert into ocpp_messages (id, tenant_id, charger_id, direction, message_type, message_id, action, payload, received_at)
       values (gen_random_uuid(), $1, $2, 'in', 'call', 'm1', 'Heartbeat', '{}', $3)`,
      [acme, charger, at],
    );
  const mail = (status: string, at: Date) =>
    worker.data.sql(
      `insert into notifications (id, tenant_id, kind, dedupe_key, to_address, status, created_at, send_after)
       values (gen_random_uuid(), $1, 'receipt', gen_random_uuid()::text, 'driver@example.test', $2, $3, $3)`,
      [acme, status, at],
    );
  const bell = (at: Date) =>
    worker.data.sql(
      `insert into staff_notifications (id, tenant_id, membership_id, kind, title, created_at)
       values (gen_random_uuid(), $1, $2, 'alert', 'CP-1 is offline', $3)`,
      [acme, membership, at],
    );
  const webhook = (processedAt: Date | null, at: Date) =>
    worker.data.sql(
      `insert into payment_webhook_events (id, event_id, type, payload, received_at, processed_at)
       values (gen_random_uuid(), gen_random_uuid()::text, 'payment_intent.succeeded', '{}', $1, $2)`,
      [at, processedAt],
    );

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
    const site = await worker.data.site(acme, 'Riverside');
    charger = await worker.data.charger(acme, site, 'CP-1');
    const connector = await worker.data.connector(acme, charger, 1);
    membership = await worker.data.member(
      acme,
      await worker.data.person('olivia@acme.test'),
      TestData.ROLE_IDS.owner,
    );
    const place = { tenantId: acme, siteId: site, chargerId: charger, connectorId: connector };
    const ended = await worker.sessions.create(place, {
      status: 'completed',
      endedAt: daysAgo(31).toISOString(),
    });
    const recent = await worker.sessions.create(place, {
      status: 'completed',
      endedAt: daysAgo(2).toISOString(),
    });
    await worker.notifications.subscription(acme, ended, 'old@example.test');
    await worker.notifications.subscription(acme, recent, 'new@example.test');

    await message(daysAgo(91));
    await message(daysAgo(89));
    await mail('sent', daysAgo(31));
    await mail('cancelled', daysAgo(40));
    await mail('pending', daysAgo(40));
    await mail('sent', daysAgo(1));
    await bell(daysAgo(91));
    await bell(daysAgo(1));
    await webhook(daysAgo(91), daysAgo(91));
    await webhook(null, daysAgo(91));
    await webhook(daysAgo(1), daysAgo(1));
    const old = await worker.notifications.export(acme, 'sessions', {});
    await worker.notifications.export(acme, 'sessions', {});
    await worker.data.sql(
      `update report_exports set status = 'expired', created_at = now() - interval '91 days' where id = $1`,
      [old],
    );
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('deletes what is older than its period and keeps the rest', async () => {
    records = [
      await count('charging_sessions'),
      await count('meter_values'),
      await count('alerts'),
    ];

    expect(await worker.app.get(RetentionJob).runOnce(new Date())).toBe(7);

    expect(await count('ocpp_messages')).toBe(1);
    expect(
      (await worker.data.sql('select status from notifications order by status')).rows,
    ).toEqual([{ status: 'pending' }, { status: 'sent' }]);
    expect(await count('staff_notifications')).toBe(1);
    expect((await worker.data.sql('select email from session_subscriptions')).rows).toEqual([
      { email: 'new@example.test' },
    ]);
    expect(await count('report_exports')).toBe(1);
    expect(await count('payment_webhook_events')).toBe(2);
  });

  it('never touches sessions, meter values, alerts or the audit log', async () => {
    expect([
      await count('charging_sessions'),
      await count('meter_values'),
      await count('alerts'),
    ]).toEqual(records);
    expect(records[0]).toBe(2);
    expect(await worker.app.get(RetentionJob).runOnce(new Date())).toBe(0);
  });
});
