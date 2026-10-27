import { TestDatabase } from '@wattwisely/db/testing';
import { NotificationSendJob } from '../notifications/notification-send.job';
import { TestWorker } from '../testing/test-worker';
import { SessionNotifyJob } from './session-notify.job';

/** Stories NTF-01, NTF-02 and SES-03: the e-mails a driver asked for, and the receipt. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver e-mails', () => {
  const worker = new TestWorker();
  let acme: string;
  let place: { tenantId: string; siteId: string; chargerId: string; connectorId: string };
  let versionId: string;

  const notify = () => worker.app.get(SessionNotifyJob).runOnce(new Date());
  const send = () => worker.app.get(NotificationSendJob).runOnce(new Date());
  const kinds = async (sessionId: string) =>
    (
      await worker.data.sql(
        'select kind from notifications where session_id = $1 order by created_at, kind',
        [sessionId],
      )
    ).rows.map((row) => row['kind']);
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
    await worker.data.sql(
      `insert into tenant_branding (id, tenant_id, display_name, support_email) values (gen_random_uuid(), $1, 'Acme Charge', 'help@acme.test')`,
      [acme],
    );
    const siteId = await worker.data.site(acme, 'Riverside');
    const chargerId = await worker.data.charger(acme, siteId, 'CP-1');
    const connectorId = await worker.data.connector(acme, chargerId, 1);
    place = { tenantId: acme, siteId, chargerId, connectorId };
    ({ versionId } = await worker.tariffs.create(acme, 'Standard', {
      idleGraceMinutes: 15,
      idleFeeCap: 1000,
    }));
  });

  afterAll(async () => {
    await worker.stop();
  });

  const chargingSession = () =>
    worker.sessions.create(place, {
      status: 'charging',
      tariffVersionId: versionId,
      startedAt: ago(30),
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [],
      history: [{ from: null, to: 'charging', event: 'transaction_started', at: ago(30) }],
      lastEventAt: ago(1),
    });

  it('sends each update once, the idle warning before the fee, and the receipt once paid for', async () => {
    const sessionId = await chargingSession();
    await worker.notifications.subscription(acme, sessionId, 'dana@driver.test');
    await worker.data.sql(
      `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, soc_percent, samples)
       values (gen_random_uuid(), $1, $2, $3, now(), 112000, 82, '[]')`,
      [acme, place.chargerId, sessionId],
    );

    expect(await notify()).toBe(2);
    expect(await notify()).toBe(0);
    expect(await kinds(sessionId)).toEqual(['session_nearly_full', 'session_started']);

    // Energy stopped 12 minutes ago: the 15-minute grace ends in 3 minutes.
    await worker.data.sql("update charging_sessions set status = 'idle' where id = $1", [
      sessionId,
    ]);
    await worker.data.sql(
      `insert into session_state_changes (id, tenant_id, session_id, from_status, to_status, event, occurred_at)
       values (gen_random_uuid(), $1, $2, 'charging', 'idle', 'energy_stopped', $3)`,
      [acme, sessionId, ago(12)],
    );
    expect(await notify()).toBe(2);

    await worker.data.sql(
      `update charging_sessions set status = 'completed', ended_at = now(), unplugged_at = now(), closed_at = now(),
         energy_wh = 12000, net_amount = 733, tax_amount = 147, gross_amount = 880 where id = $1`,
      [sessionId],
    );
    await worker.data.sql(
      `insert into session_line_items (id, tenant_id, session_id, position, kind, band_name, quantity, unit, unit_price, net, tax, gross)
       values (gen_random_uuid(), $1, $2, 1, 'energy', 'Off-peak', 12000, 'wh', 3000, 733, 147, 880)`,
      [acme, sessionId],
    );
    expect(await notify()).toBe(1);
    expect(await notify()).toBe(0);

    expect(await send()).toBe(5);
    const mails = worker.mail.to('dana@driver.test');
    expect(mails.map((mail) => mail.subject)).toEqual(
      expect.arrayContaining([
        'Charging started at Riverside',
        'Your battery is at 82%',
        'Charging finished at Riverside',
        'The idle fee starts in 5 minutes',
        'Your receipt from Riverside',
      ]),
    );
    expect(
      mails.every((mail) => mail.replyTo === 'help@acme.test' && mail.fromName === 'Acme Charge'),
    ).toBe(true);
    const idle = mails.find((mail) => mail.subject === 'The idle fee starts in 5 minutes');
    expect(idle?.text).toContain('GBP 0.10 per minute, at most GBP 10.00');
    const receipt = mails.find((mail) => mail.subject === 'Your receipt from Riverside');
    expect(receipt?.text).toContain('Energy (Off-peak), 12.00 kWh: GBP 8.80');
    expect(receipt?.text).toContain('Total GBP 8.80, including tax of GBP 1.47.');
  });

  it('leaves out the updates a driver turned off, never the receipt', async () => {
    const sessionId = await chargingSession();
    await worker.notifications.subscription(acme, sessionId, 'eve@driver.test', {
      started: false,
      nearlyFull: false,
      finished: false,
      idleWarning: false,
    });
    expect(await notify()).toBe(0);

    await worker.data.sql(
      "update charging_sessions set status = 'completed', closed_at = now(), gross_amount = 0, tax_amount = 0, net_amount = 0 where id = $1",
      [sessionId],
    );
    expect(await notify()).toBe(1);
    await send();
    expect(worker.mail.to('eve@driver.test')[0].text).toContain('This session was free.');
  });

  it('stops writing to an address the mail server refused for good', async () => {
    const sessionId = await chargingSession();
    await worker.notifications.subscription(acme, sessionId, 'nobody@driver.test');
    expect(await notify()).toBe(1);
    worker.mail.failure = Object.assign(new Error('550 No such user'), { responseCode: 550 });

    await send();
    worker.mail.failure = null;

    expect(
      await worker.row('select status, attempts from notifications where session_id = $1', [
        sessionId,
      ]),
    ).toEqual({ status: 'failed', attempts: 1 });
    expect(
      await worker.row('select is_undeliverable from session_subscriptions where session_id = $1', [
        sessionId,
      ]),
    ).toEqual({ is_undeliverable: true });
    await worker.data.sql(
      "update charging_sessions set status = 'completed', closed_at = now() where id = $1",
      [sessionId],
    );
    expect(await notify()).toBe(0);
  });
});
