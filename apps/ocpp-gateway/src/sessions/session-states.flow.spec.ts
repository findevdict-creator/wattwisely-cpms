import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase, TestTariffs } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/** A session's states as the charger reports: paused, idle, charging again, stopped, unplugged. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Session states', () => {
  const gateway = new TestGateway();
  let chargerId: string;
  let versionId: string;
  let charger: SimulatedCharger;
  let messages: ChargerMessages;
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

  beforeAll(async () => {
    await gateway.start({ OCPP_ACCEPT_UNKNOWN_ID_TAGS: 'true' });
    const acme = await gateway.data.tenant('acme-charging');
    const site = await gateway.data.site(acme, 'Riverside');
    const tariffs = new TestTariffs(gateway.data);
    const tariff = await tariffs.create(acme, 'Standard');
    versionId = tariff.versionId;
    await tariffs.assign(site, tariff.tariffId);
    chargerId = await gateway.data.charger(acme, site, 'WW-STATES');
    charger = gateway.charger('WW-STATES');
    messages = new ChargerMessages(charger);
    await charger.connect();
    await messages.boot();
  });

  afterAll(async () => {
    await charger?.close();
    await gateway.stop();
  });

  const historyOf = async (sessionId: unknown) => {
    const { rows } = await gateway.data.sql(
      `select coalesce(from_status::text, '-') || ' > ' || to_status || ' (' || event || ')' as step
       from session_state_changes where session_id = $1 order by occurred_at, created_at`,
      [sessionId],
    );
    return rows.map((row) => row.step);
  };

  it('copies the site tariff and time zone onto a new session', async () => {
    const started = await messages.startTransaction(1, 'TAG-1', 5000, minutesAgo(20));
    const session = await gateway.eventually(
      `select time_zone, tariff_version_id, currency, status from charging_sessions
       where charger_id = $1 and ocpp_transaction_id = $2`,
      [chargerId, started.transactionId],
    );
    expect(session).toEqual({
      time_zone: 'Europe/London',
      tariff_version_id: versionId,
      currency: 'GBP',
      status: 'charging',
    });
    await messages.stopTransaction(started.transactionId, 5000, { reason: 'EVDisconnected' });
  });

  it('follows pause, idle and resume, then the stop and the unplug', async () => {
    const started = await messages.startTransaction(2, 'TAG-2', 1000, minutesAgo(15));
    const { id } = (await gateway.eventually<{ id: string }>(
      'select id from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2',
      [chargerId, started.transactionId],
    )) as { id: string };

    await messages.meterValuesAt(2, started.transactionId, {
      energyWh: 2000,
      powerW: 7000,
      at: minutesAgo(14),
    });
    await messages.statusAt(2, 'SuspendedEVSE', minutesAgo(13));
    await messages.statusAt(2, 'Charging', minutesAgo(12));
    await messages.meterValuesAt(2, started.transactionId, {
      energyWh: 3000,
      powerW: 7000,
      at: minutesAgo(11),
    });
    await messages.meterValuesAt(2, started.transactionId, {
      energyWh: 3000,
      powerW: 0,
      at: minutesAgo(8),
    });
    const idle = await gateway.events.next(
      (event) => event.type === 'session.updated' && event.data['status'] === 'idle',
    );
    expect(idle.data).toMatchObject({ session_id: id, energy_wh: 2000, currency: 'GBP' });
    await messages.meterValuesAt(2, started.transactionId, {
      energyWh: 3500,
      powerW: 7000,
      at: minutesAgo(6),
    });
    await messages.stopTransaction(started.transactionId, 4000, {
      reason: 'Local',
      timestamp: minutesAgo(5).toISOString(),
    });
    expect(
      await gateway.eventually(
        `select status, unplugged_at from charging_sessions where id = $1 and status = 'stopping'`,
        [id],
      ),
    ).toEqual({ status: 'stopping', unplugged_at: null });

    await messages.status(2, 'Available');
    await gateway.eventually(
      'select id from charging_sessions where id = $1 and unplugged_at is not null',
      [id],
    );
    expect(await historyOf(id)).toEqual([
      '- > charging (transaction_started)',
      'charging > suspended (suspended)',
      'suspended > charging (resumed)',
      'charging > idle (energy_stopped)',
      'idle > charging (energy_resumed)',
      'charging > stopping (transaction_ended)',
      'stopping > stopping (unplugged)',
    ]);
  });

  it('ignores reports about a session that has already stopped', async () => {
    const started = await messages.startTransaction(3, 'TAG-3', 0, minutesAgo(3));
    await messages.stopTransaction(started.transactionId, 100, { reason: 'Local' });
    await messages.stopTransaction(started.transactionId, 100, { reason: 'Local' });
    await messages.meterValues(3, started.transactionId, 900);
    const session = await gateway.eventually<{ id: string; energy_wh: number }>(
      `select id, energy_wh::int from charging_sessions
       where charger_id = $1 and ocpp_transaction_id = $2 and status = 'stopping'`,
      [chargerId, started.transactionId],
    );

    expect(session?.energy_wh).toBe(100);
    expect(await historyOf(session?.id)).toEqual([
      '- > charging (transaction_started)',
      'charging > stopping (transaction_ended)',
    ]);
  });
});
