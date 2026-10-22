import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { MessageLogWriter } from '../log/message-log.writer';
import { TestGateway } from '../testing/test-gateway';

/** The message pipeline end to end: framing errors, status, sessions, meter values and the log. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Charger messages', () => {
  const gateway = new TestGateway();
  let acme: string;
  let chargerId: string;
  let charger: SimulatedCharger;
  let messages: ChargerMessages;

  beforeAll(async () => {
    await gateway.start({ OCPP_ACCEPT_UNKNOWN_ID_TAGS: 'true' });
    acme = await gateway.data.tenant('acme-charging');
    const site = await gateway.data.site(acme, 'Riverside');
    chargerId = await gateway.data.charger(acme, site, 'WW-MSG');
    charger = gateway.charger('WW-MSG');
    messages = new ChargerMessages(charger);
    await charger.connect();
  });

  afterAll(async () => {
    await charger?.close();
    await gateway.stop();
  });

  it('answers every CALL, and a bad one with the right CALLERROR', async () => {
    expect(await charger.call('Heartbeat', {})).toMatchObject({
      kind: 'error',
      code: 'SecurityError',
    });
    expect((await messages.boot()).status).toBe('Accepted');
    expect(await charger.call('DataTransfer', { vendorId: 'x' })).toMatchObject({
      kind: 'error',
      code: 'NotImplemented',
    });
    expect(
      await charger.call('StatusNotification', {
        connectorId: 'one',
        errorCode: 'NoError',
        status: 'Available',
      }),
    ).toMatchObject({
      kind: 'error',
      code: 'TypeConstraintViolation',
      details: { field: 'connectorId' },
    });
    expect(
      await charger.call('StatusNotification', { connectorId: 1, status: 'Available' }),
    ).toMatchObject({ kind: 'error', code: 'PropertyConstraintViolation' });

    charger.sendRaw('[2, "raw-1", "Heartbeat"]');
    const result = await charger.call('Heartbeat', {});
    expect(result).toMatchObject({ kind: 'result', payload: { currentTime: expect.any(String) } });
  });

  it('creates the connector a StatusNotification names and pushes the status live', async () => {
    await messages.status(0, 'Available');
    await messages.status(2, 'Preparing', 'NoError', 'Cable in');
    const event = await gateway.events.next(
      (candidate) =>
        candidate.type === 'connector.status' && candidate.data['ocpp_connector_id'] === 2,
    );
    expect(event.data).toMatchObject({ status: 'preparing', status_info: 'Cable in' });
    const { rows } = await gateway.data.sql(
      'select ocpp_connector_id, label, status from connectors where charger_id = $1 order by ocpp_connector_id',
      [chargerId],
    );
    expect(rows).toEqual([{ ocpp_connector_id: 2, label: 'A', status: 'preparing' }]);

    await messages.status(2, 'Faulted', 'GroundFailure');
    const faulted = await gateway.eventually(
      `select error_code from connectors where charger_id = $1 and status = 'faulted'`,
      [chargerId],
    );
    expect(faulted).toEqual({ error_code: 'GroundFailure' });
  });

  it('runs a charging session from StartTransaction through MeterValues to StopTransaction', async () => {
    expect((await messages.authorize('ANY-TAG')).idTagInfo.status).toBe('Accepted');
    const started = await messages.startTransaction(1, 'ANY-TAG', 1000);
    expect(started.idTagInfo.status).toBe('Accepted');
    expect(started.transactionId).toBeGreaterThanOrEqual(1000);

    const session = await gateway.eventually(
      `select id, status, meter_start_wh::int, energy_wh::int from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2`,
      [chargerId, started.transactionId],
    );
    expect(session).toMatchObject({ status: 'charging', meter_start_wh: 1000, energy_wh: 0 });

    const resent = await messages.startTransaction(
      1,
      'ANY-TAG',
      1000,
      new Date(Date.now() - 60_000),
    );
    expect(resent.transactionId).not.toBe(started.transactionId);

    await messages.meterValues(1, started.transactionId, 1500, 7000);
    const live = await gateway.events.next(
      (event) => event.type === 'session.updated' && event.data['energy_wh'] === 500,
    );
    expect(live.data).toMatchObject({
      session_id: session['id'],
      status: 'charging',
      power_w: 7000,
    });

    await messages.stopTransaction(started.transactionId, 2200, {
      reason: 'EVDisconnected',
      idTag: 'ANY-TAG',
    });
    const ended = await gateway.eventually(
      `select status, meter_stop_wh::int, energy_wh::int, stop_reason from charging_sessions where id = $1 and status = 'ended'`,
      [session['id']],
    );
    expect(ended).toEqual({
      status: 'ended',
      meter_stop_wh: 2200,
      energy_wh: 1200,
      stop_reason: 'EVDisconnected',
    });
    const samples = await gateway.row(
      'select count(*)::int as n from meter_values where session_id = $1',
      [session['id']],
    );
    expect(samples).toEqual({ n: 1 });
    expect(
      await charger.call('StopTransaction', {
        transactionId: 4242,
        meterStop: 1,
        timestamp: new Date().toISOString(),
      }),
    ).toMatchObject({ kind: 'result' });
  });

  it('keeps every frame in the message log, both ways', async () => {
    await gateway.app.get(MessageLogWriter).flush();
    const { rows } = await gateway.data.sql(
      `select direction, message_type, action, error_code from ocpp_messages where charger_id = $1 and action in ('BootNotification', 'DataTransfer')
       order by received_at`,
      [chargerId],
    );
    expect(rows).toEqual([
      { direction: 'in', message_type: 'call', action: 'BootNotification', error_code: null },
      {
        direction: 'out',
        message_type: 'call_result',
        action: 'BootNotification',
        error_code: null,
      },
      { direction: 'in', message_type: 'call', action: 'DataTransfer', error_code: null },
      {
        direction: 'out',
        message_type: 'call_error',
        action: 'DataTransfer',
        error_code: 'NotImplemented',
      },
    ]);
  });
});
