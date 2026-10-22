import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase, TestSessions, TestTariffs } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/** A paid session (module 6) waits at `starting`; the charger's StartTransaction adopts it instead of opening a new one. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Paid sessions', () => {
  const gateway = new TestGateway();
  let acme: string;
  let site: string;
  let chargerId: string;
  let charger: SimulatedCharger;
  let messages: ChargerMessages;

  beforeAll(async () => {
    await gateway.start({ OCPP_ACCEPT_UNKNOWN_ID_TAGS: 'true' });
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
    const tariffs = new TestTariffs(gateway.data);
    const tariff = await tariffs.create(acme, 'Standard');
    await tariffs.assign(site, tariff.tariffId);
    chargerId = await gateway.data.charger(acme, site, 'WW-PAID');
    charger = gateway.charger('WW-PAID');
    messages = new ChargerMessages(charger);
    await charger.connect();
    await messages.boot();
  });

  afterAll(async () => {
    await charger?.close();
    await gateway.stop();
  });

  it('gives the waiting session the transaction instead of opening a second one', async () => {
    const connectorId = await gateway.data.connector(acme, chargerId, 1);
    const commandId = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'remote_start',
      payload: { ocpp_connector_id: 1, id_tag: 'TEST-TAG' },
    });
    const waiting = await new TestSessions(gateway.data).create(
      { tenantId: acme, siteId: site, chargerId, connectorId },
      {
        status: 'starting',
        hasStarted: false,
        startedAt: new Date().toISOString(),
        endedAt: null,
        unpluggedAt: null,
        meterStopWh: null,
        readings: [],
        history: [
          {
            from: 'authorising',
            to: 'starting',
            event: 'authorised',
            at: new Date().toISOString(),
          },
        ],
        lastEventAt: new Date().toISOString(),
        commandId,
      },
    );
    await gateway.data.sql('update charging_sessions set is_paid = true where id = $1', [waiting]);

    const started = await messages.startTransaction(1, 'TEST-TAG', 7000);

    expect(started.transactionId).toBeGreaterThan(0);
    const session = await gateway.eventually(
      `select id, status, ocpp_transaction_id, meter_start_wh::int, is_paid
       from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2`,
      [chargerId, started.transactionId],
    );
    expect(session).toEqual({
      id: waiting,
      status: 'charging',
      ocpp_transaction_id: started.transactionId,
      meter_start_wh: 7000,
      is_paid: true,
    });
    const { rows } = await gateway.data.sql(
      'select count(*)::int as sessions from charging_sessions where charger_id = $1',
      [chargerId],
    );
    expect(rows[0]['sessions']).toBe(1);
    const history = await gateway.data.sql(
      `select from_status::text as "from", to_status as "to", event from session_state_changes
       where session_id = $1 order by occurred_at, created_at`,
      [waiting],
    );
    expect(history.rows).toEqual([
      { from: 'authorising', to: 'starting', event: 'authorised' },
      { from: 'starting', to: 'charging', event: 'transaction_started' },
    ]);
  });
});
