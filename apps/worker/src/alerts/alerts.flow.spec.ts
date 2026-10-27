import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { NotificationSendJob } from '../notifications/notification-send.job';
import { TestWorker } from '../testing/test-worker';
import { AlertScanJob } from './alert-scan.job';

/** Stories NTF-03 and NTF-04: alerts open, update, close and reach the right people. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Alert scan job', () => {
  const worker = new TestWorker();
  let acme: string;
  let site: string;
  let charger: string;
  let connector: string;
  let tomMembership: string;
  let oliviaMembership: string;

  const scan = (at = new Date()) => worker.app.get(AlertScanJob).runOnce(at);
  const count = async (text: string, values: unknown[] = []) =>
    Number((await worker.row(`select count(*)::int as n from ${text}`, values))?.['n']);
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const hhmm = (at: Date) => at.toISOString().slice(11, 16);

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
    site = await worker.data.site(acme, 'Riverside');
    charger = await worker.data.charger(acme, site, 'CP-1');
    connector = await worker.data.connector(acme, charger, 1);
    const olivia = await worker.data.person('olivia@acme.test', 'Olivia');
    oliviaMembership = await worker.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    const tom = await worker.data.person('tom@acme.test', 'Tom');
    tomMembership = await worker.data.member(acme, tom, TestData.ROLE_IDS.technician, site);
    const other = await worker.data.site(acme, 'Depot North');
    const tina = await worker.data.person('tina@acme.test', 'Tina');
    await worker.data.member(acme, tina, TestData.ROLE_IDS.technician, other);
  });

  afterAll(async () => {
    await worker.stop();
  });

  const goOffline = async () => {
    await worker.data.sql('delete from charger_connections where charger_id = $1', [charger]);
    await worker.data.sql('update chargers set last_seen_at = $2 where id = $1', [
      charger,
      minutesAgo(5),
    ]);
  };

  const goOnline = () =>
    worker.data.sql(
      `insert into charger_connections (charger_id, tenant_id, instance_id, connection_id, ocpp_version, is_booted, lease_expires_at)
       values ($1, $2, 'gateway-1:1', 'c-1', '1.6', true, now() + interval '1 minute')`,
      [charger, acme],
    );

  it('opens one alert for an offline charger and tells the default roles at its site', async () => {
    await goOffline();

    expect(await scan()).toBe(1);
    expect(await scan()).toBe(0);

    expect(
      await worker.row(
        "select status, title, occurrences from alerts where type = 'charger_offline'",
      ),
    ).toEqual({
      status: 'open',
      title: 'CP-1 is offline',
      occurrences: 1,
    });
    // Owner by e-mail and in the portal, the Riverside technician in the portal only, the Depot North one not at all.
    expect(await count('staff_notifications')).toBe(2);
    expect(await count("notifications where kind = 'alert_opened'")).toBe(1);
    expect(
      await worker.row("select to_address from notifications where kind = 'alert_opened'"),
    ).toEqual({
      to_address: 'olivia@acme.test',
    });
  });

  it('closes the alert when the charger is back and reopens it quietly if it drops again soon', async () => {
    await goOnline();
    expect(await scan()).toBe(1);
    expect(
      await worker.row("select status, close_reason from alerts where type = 'charger_offline'"),
    ).toEqual({
      status: 'closed',
      close_reason: 'cleared',
    });

    await goOffline();
    expect(await scan()).toBe(0);

    expect(await count("alerts where type = 'charger_offline'")).toBe(1);
    expect(
      await worker.row("select status, occurrences from alerts where type = 'charger_offline'"),
    ).toEqual({
      status: 'open',
      occurrences: 2,
    });
    expect(await count('staff_notifications')).toBe(2);
  });

  it('holds e-mails in quiet hours, except for a faulted connector', async () => {
    await worker.notifications.quietHours(acme, oliviaMembership, {
      start: hhmm(minutesAgo(60)),
      end: hhmm(minutesAgo(-60)),
    });
    await worker.data.sql(
      "update connectors set status = 'faulted', error_code = 'GroundFailure', status_changed_at = now() where id = $1",
      [connector],
    );
    await worker.data.sql(
      `insert into charging_sessions (id, tenant_id, site_id, charger_id, connector_id, id_tag, status, time_zone,
         started_at, last_event_at)
       values (gen_random_uuid(), $1, $2, $3, $4, 'TAG', 'charging', 'UTC', now() - interval '7 hours', now() - interval '7 hours')`,
      [acme, site, charger, connector],
    );

    expect(await scan()).toBe(2);

    const held = await worker.row(
      `select n.send_after > now() as is_held from notifications n join alerts a on a.id = n.alert_id
       where a.type = 'session_stuck'`,
    );
    const urgent = await worker.row(
      `select n.send_after <= now() as is_due from notifications n join alerts a on a.id = n.alert_id
       where a.type = 'connector_faulted'`,
    );
    expect(held).toEqual({ is_held: true });
    expect(urgent).toEqual({ is_due: true });
    expect(await worker.row("select title from alerts where type = 'connector_faulted'")).toEqual({
      title: 'CP-1 connector A is faulted',
    });
  });

  it('follows the tenant routing rules: start failures to Tom by e-mail only', async () => {
    await worker.notifications.rule(
      acme,
      'start_failures',
      { membershipId: tomMembership },
      { isEmail: true, isInPortal: false },
    );
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await worker.data.sql(
        `insert into charger_commands (id, tenant_id, charger_id, action, status, queued_until, requested_by_label)
         values (gen_random_uuid(), $1, $2, 'remote_start', 'rejected', now(), 'test')`,
        [acme, charger],
      );
    }
    const inboxBefore = await count('staff_notifications');

    expect(await scan()).toBe(1);

    expect(await worker.row("select title from alerts where type = 'start_failures'")).toEqual({
      title: 'CP-1 failed to start 3 sessions in the last hour',
    });
    expect(await count('staff_notifications')).toBe(inboxBefore);
    expect(
      await worker.row(
        "select n.to_address from notifications n join alerts a on a.id = n.alert_id where a.type = 'start_failures'",
      ),
    ).toEqual({ to_address: 'tom@acme.test' });
  });

  it('raises an alert when a charger does not come back after a reset', async () => {
    await worker.data.sql(
      `insert into charger_commands (id, tenant_id, charger_id, action, status, queued_until, requested_by_label, completed_at)
       values (gen_random_uuid(), $1, $2, 'reset', 'accepted', now(), 'test', now() - interval '10 minutes')`,
      [acme, charger],
    );

    expect(await scan()).toBe(1);
    expect(await count("alerts where type = 'reset_no_return' and status = 'open'")).toBe(1);

    await worker.data.sql('update chargers set last_boot_at = now() where id = $1', [charger]);
    expect(await scan()).toBe(1);
    expect(await count("alerts where type = 'reset_no_return' and status = 'closed'")).toBe(1);
  });

  it('sends the due e-mails in the tenant brand and drops a held one whose alert closed', async () => {
    const send = () => worker.app.get(NotificationSendJob).runOnce(new Date());

    expect(await send()).toBe(3);
    expect(worker.mail.sent.map((message) => message.subject).sort()).toEqual([
      'Alert: CP-1 connector A is faulted',
      'Alert: CP-1 failed to start 3 sessions in the last hour',
      'Alert: CP-1 is offline',
    ]);
    expect(worker.mail.sent[0].fromName).toBe('acme charging');
    expect(worker.mail.sent[0].text).toContain('http://portal.test/alerts/');

    await worker.data.sql("update charging_sessions set status = 'failed', closed_at = now()");
    expect(await scan()).toBe(1);
    await worker.data.sql(
      "update notifications set send_after = now() - interval '1 second' where status = 'pending'",
    );

    // The held stuck-session and reset e-mails: both their alerts closed during the quiet hours.
    expect(await send()).toBe(2);
    expect(worker.mail.sent).toHaveLength(3);
    expect(
      await worker.row(
        "select n.status from notifications n join alerts a on a.id = n.alert_id where a.type = 'session_stuck'",
      ),
    ).toEqual({ status: 'cancelled' });
  });
});
