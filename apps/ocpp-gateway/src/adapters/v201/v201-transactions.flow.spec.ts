import { ChargerMessages201, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { TestGateway } from '../../testing/test-gateway';

/** A 2.0.1 charge end to end: TransactionEvent Started, Updated and Ended become a session as 1.6's three messages do. */
(TestDatabase.isConfigured() ? describe : describe.skip)('OCPP 2.0.1 transactions', () => {
  const gateway = new TestGateway();
  let acme: string;
  let site: string;

  beforeAll(async () => {
    await gateway.start({ OCPP_ACCEPT_UNKNOWN_ID_TAGS: 'true' });
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
  });

  afterAll(async () => gateway.stop());

  const connectAndBoot = async (identity: string): Promise<SimulatedCharger> => {
    const charger = gateway.charger(identity, { protocols: ChargerMessages201.PROTOCOLS });
    await charger.connect();
    await new ChargerMessages201(charger).boot();
    return charger;
  };

  it('runs a charge from Started through Updated to Ended, with the connector following the charging state', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-TX');
    const charger = await connectAndBoot('WW-TX');
    const messages = new ChargerMessages201(charger);
    expect((await messages.authorize('CARD-1')).idTokenInfo.status).toBe('Accepted');
    await messages.status(1, 'Occupied');

    const started = await messages.transactionStarted('TX-1', { idToken: 'CARD-1', meterWh: 1000 });
    expect(started).toEqual({ idTokenInfo: { status: 'Accepted' } });
    const session = await gateway.eventually(
      `select id, status, ocpp_transaction_id, meter_start_wh::int, energy_wh::int, id_tag
       from charging_sessions where charger_id = $1 and ocpp_transaction_ref = 'TX-1'`,
      [chargerId],
    );
    expect(session).toMatchObject({ status: 'charging', meter_start_wh: 1000, id_tag: 'CARD-1' });
    expect(session['ocpp_transaction_id']).toBeGreaterThanOrEqual(1000);
    await gateway.eventually(
      `select 1 from connectors where charger_id = $1 and evse_id = 1 and status = 'preparing'`,
      [chargerId],
    );

    expect(
      await messages.transactionUpdated('TX-1', {
        meterWh: 1500,
        powerW: 7000,
        chargingState: 'Charging',
      }),
    ).toEqual({});
    const live = await gateway.events.next(
      (event) => event.type === 'session.updated' && event.data['energy_wh'] === 500,
    );
    expect(live.data).toMatchObject({
      session_id: session['id'],
      status: 'charging',
      power_w: 7000,
    });
    await gateway.eventually(
      `select 1 from connectors where charger_id = $1 and evse_id = 1 and status = 'charging'`,
      [chargerId],
    );

    await messages.transactionStarted('TX-1', { idToken: 'CARD-1', meterWh: 1000 });
    const count = await gateway.row(
      'select count(*)::int as n from charging_sessions where charger_id = $1',
      [chargerId],
    );
    expect(count).toEqual({ n: 1 });

    await messages.transactionEnded('TX-1', { meterWh: 2200, chargingState: 'EVConnected' });
    const ended = await gateway.eventually(
      `select status, meter_stop_wh::int, energy_wh::int, stop_reason, unplugged_at = ended_at as is_unplugged
       from charging_sessions where id = $1 and status = 'stopping'`,
      [session['id']],
    );
    expect(ended).toEqual({
      status: 'stopping',
      meter_stop_wh: 2200,
      energy_wh: 1200,
      stop_reason: 'EVDisconnected',
      is_unplugged: true,
    });
    await gateway.eventually(
      `select 1 from connectors where charger_id = $1 and evse_id = 1 and status = 'finishing'`,
      [chargerId],
    );
    // One reading per event that carried a meter value: Started, Updated, the resent Started, Ended.
    expect(
      await gateway.row('select count(*)::int as n from meter_values where session_id = $1', [
        session['id'],
      ]),
    ).toEqual({ n: 4 });
    await charger.close();
  });

  it('takes a transaction that starts before the card, and one it never saw start', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-LATE');
    const charger = await connectAndBoot('WW-LATE');
    const messages = new ChargerMessages201(charger);

    expect(await messages.transactionStarted('TX-2')).toEqual({});
    const opened = await gateway.eventually(
      `select id, id_tag, meter_start_wh from charging_sessions where charger_id = $1 and ocpp_transaction_ref = 'TX-2'`,
      [chargerId],
    );
    expect(opened).toMatchObject({ id_tag: '', meter_start_wh: null });

    expect(
      await messages.transactionUpdated('TX-2', {
        idToken: 'CARD-2',
        meterWh: 500,
        chargingState: 'Charging',
        triggerReason: 'Authorized',
      }),
    ).toEqual({ idTokenInfo: { status: 'Accepted' } });
    await messages.transactionUpdated('TX-2', { meterWh: 900, chargingState: 'Charging' });
    const identified = await gateway.eventually(
      `select id_tag, meter_start_wh::int, energy_wh::int from charging_sessions where id = $1 and energy_wh = 400`,
      [opened['id']],
    );
    expect(identified).toEqual({ id_tag: 'CARD-2', meter_start_wh: 500, energy_wh: 400 });

    await messages.transactionUpdated('TX-UNSEEN', {
      evseId: 2,
      meterWh: 3000,
      chargingState: 'Charging',
    });
    const unseen = await gateway.eventually(
      `select s.status, s.meter_start_wh::int, c.evse_id from charging_sessions s join connectors c on c.id = s.connector_id
       where s.charger_id = $1 and s.ocpp_transaction_ref = 'TX-UNSEEN'`,
      [chargerId],
    );
    expect(unseen).toEqual({ status: 'charging', meter_start_wh: 3000, evse_id: 2 });
    await charger.close();
  });
});
