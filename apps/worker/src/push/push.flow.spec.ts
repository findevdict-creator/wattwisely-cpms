import { TestDatabase, TestDrivers, TestSavedCards } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { PushNotifyJob } from './push-notify.job';

/** Module 34: the pushes a driver with the app gets about a charge, each once. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Pushes to the app', () => {
  const worker = new TestWorker();
  let acme: string;
  let place: { tenantId: string; siteId: string; chargerId: string; connectorId: string };
  let versionId: string;

  const notify = () => worker.app.get(PushNotifyJob).runOnce(new Date());
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const titles = (token: string) =>
    worker.push.sent
      .filter((push) => push.target.token === token)
      .map((push) => push.message.title);

  /** A driver with the app on one phone, and a charge of theirs under way. */
  const driverWithPhone = async (email: string, token: string, phoneAddedMinutesAgo = 60) => {
    const accountId = await new TestSavedCards(worker.data).login(email);
    const driverId = await new TestDrivers(worker.data).driver(acme, email);
    await new TestSavedCards(worker.data).link(driverId, accountId);
    await worker.data.sql(
      `insert into driver_devices (id, driver_account_id, platform, token, created_at)
       values (gen_random_uuid(), $1, 'android', $2, $3)`,
      [accountId, token, ago(phoneAddedMinutesAgo)],
    );
    const sessionId = await worker.sessions.create(place, {
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
    await worker.data.sql('update charging_sessions set driver_id = $2 where id = $1', [
      sessionId,
      driverId,
    ]);
    return { accountId, sessionId };
  };

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
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

  it('pushes started, nearly full, the idle warning and the receipt, each once', async () => {
    const { sessionId } = await driverWithPhone('dana@driver.test', 'fcm-token-danas-phone');
    await worker.data.sql(
      `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, soc_percent, samples)
       values (gen_random_uuid(), $1, $2, $3, now(), 112000, 82, '[]')`,
      [acme, place.chargerId, sessionId],
    );
    expect(await notify()).toBe(2);
    expect(await notify()).toBe(0);

    await worker.data.sql("update charging_sessions set status = 'idle' where id = $1", [
      sessionId,
    ]);
    await worker.data.sql(
      `insert into session_state_changes (id, tenant_id, session_id, from_status, to_status, event, occurred_at)
       values (gen_random_uuid(), $1, $2, 'charging', 'idle', 'energy_stopped', $3)`,
      [acme, sessionId, ago(12)],
    );
    expect(await notify()).toBe(1);

    await worker.data.sql(
      `update charging_sessions set status = 'completed', ended_at = now(), unplugged_at = now(), closed_at = now(),
         energy_wh = 12000, net_amount = 733, tax_amount = 147, gross_amount = 880 where id = $1`,
      [sessionId],
    );
    expect(await notify()).toBe(1);
    expect(await notify()).toBe(0);

    expect(titles('fcm-token-danas-phone')).toEqual([
      'Charging at Riverside',
      'Nearly full: 82%',
      'Unplug within 5 minutes',
      'Charge complete: GBP 8.80',
    ]);
    const receipt = worker.push.sent[worker.push.sent.length - 1];
    expect(receipt.message.data).toEqual({ url: `/sessions/${sessionId}`, session_id: sessionId });
    expect(
      await worker.row(
        `select count(*)::int as sent from push_deliveries where session_id = $1 and sent_at is not null`,
        [sessionId],
      ),
    ).toEqual({ sent: 4 });
  });

  it('leaves out what the driver turned off, and charges from before the phone', async () => {
    const { accountId, sessionId } = await driverWithPhone(
      'eve@driver.test',
      'fcm-token-eves-phone',
    );
    await worker.data.sql(
      'update driver_accounts set wants_started = false, wants_nearly_full = false where id = $1',
      [accountId],
    );
    expect(await notify()).toBe(0);

    const late = await driverWithPhone('finn@driver.test', 'fcm-token-finns-phone', 5);
    expect(await notify()).toBe(0);
    expect(titles('fcm-token-finns-phone')).toEqual([]);
    expect(late.sessionId).not.toBe(sessionId);
  });

  it('forgets a phone the service no longer knows', async () => {
    worker.push.invalidTokens.add('fcm-token-gones-phone');
    const { sessionId } = await driverWithPhone('gone@driver.test', 'fcm-token-gones-phone');
    expect(await notify()).toBe(0);
    expect(
      await worker.row(
        'select invalid_at is not null as is_invalid from driver_devices where token = $1',
        ['fcm-token-gones-phone'],
      ),
    ).toEqual({ is_invalid: true });
    expect(
      await worker.row('select sent_at, last_error from push_deliveries where session_id = $1', [
        sessionId,
      ]),
    ).toEqual({ sent_at: null, last_error: expect.any(String) });
  });
});
