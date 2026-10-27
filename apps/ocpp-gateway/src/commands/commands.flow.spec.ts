import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/** Commands end to end: the API's row and notification become a CALL, and the answer a status. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Charger commands', () => {
  const gateway = new TestGateway();
  let acme: string;
  let site: string;

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
  });

  afterAll(async () => gateway.stop());

  const connectAndBoot = async (identity: string): Promise<SimulatedCharger> => {
    const charger = gateway.charger(identity);
    await charger.connect();
    await new ChargerMessages(charger).boot();
    return charger;
  };

  it('sends a remote start, and the tag it carried authorizes the session that follows', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-CMD');
    const charger = await connectAndBoot('WW-CMD');
    const messages = new ChargerMessages(charger);
    expect((await messages.authorize('WW-STRANGER')).idTagInfo.status).toBe('Invalid');

    const commandId = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'remote_start',
      payload: { ocpp_connector_id: 1, id_tag: 'WWABC123' },
    });
    const call = await charger.nextCall();
    expect(call).toMatchObject({
      action: 'RemoteStartTransaction',
      payload: { connectorId: 1, idTag: 'WWABC123' },
    });
    charger.reply(call, { status: 'Accepted' });

    const done = await gateway.eventually(
      `select status, result, error from charger_commands where id = $1 and status <> 'sent'`,
      [commandId],
    );
    expect(done).toEqual({ status: 'accepted', result: { status: 'Accepted' }, error: null });
    expect(await gateway.events.next((event) => event.type === 'command.result')).toMatchObject({
      charger_id: chargerId,
      data: { command_id: commandId, action: 'remote_start', status: 'accepted' },
    });

    expect((await messages.authorize('WWABC123')).idTagInfo.status).toBe('Accepted');
    const started = await messages.startTransaction(1, 'WWABC123', 0);
    expect(started.idTagInfo.status).toBe('Accepted');
    const session = await gateway.eventually(
      'select command_id from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2',
      [chargerId, started.transactionId],
    );
    expect(session).toEqual({ command_id: commandId });

    const stop = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'remote_stop',
      payload: { ocpp_transaction_id: started.transactionId, session_id: 'x' },
    });
    const stopCall = await charger.nextCall();
    expect(stopCall.payload).toEqual({ transactionId: started.transactionId });
    charger.reply(stopCall, { status: 'Rejected' });
    expect(
      await gateway.eventually(
        `select status, error from charger_commands where id = $1 and status = 'rejected'`,
        [stop],
      ),
    ).toEqual({ status: 'rejected', error: 'The charger answered Rejected.' });
    await charger.close();
  });

  it('times out a command the charger never answers, and fails one it answers with an error', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-SLOW');
    const charger = await connectAndBoot('WW-SLOW');

    const slow = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'unlock',
      payload: { ocpp_connector_id: 1 },
    });
    expect((await charger.nextCall()).action).toBe('UnlockConnector');
    expect(
      await gateway.eventually(
        `select status from charger_commands where id = $1 and status = 'timed_out'`,
        [slow],
      ),
    ).toEqual({ status: 'timed_out' });

    const reset = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'reset',
      payload: { type: 'Hard' },
    });
    const call = await charger.nextCall();
    expect(call.payload).toEqual({ type: 'Hard' });
    charger.sendRaw(JSON.stringify([4, call.id, 'NotSupported', 'No reset here', {}]));
    expect(
      await gateway.eventually(
        `select status, error from charger_commands where id = $1 and status = 'failed'`,
        [reset],
      ),
    ).toEqual({ status: 'failed', error: 'NotSupported: No reset here' });
    await charger.close();
  });

  it('holds commands for an absent charger until it boots, and expires the ones that waited too long', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-AWAY');
    const stale = await gateway.queueCommand(
      { tenantId: acme, chargerId, action: 'unlock', payload: { ocpp_connector_id: 1 } },
      -1,
    );
    const waiting = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'change_availability',
      payload: { ocpp_connector_id: 0, type: 'Inoperative' },
    });
    expect(
      await gateway.row('select status from charger_commands where id = $1', [waiting]),
    ).toEqual({ status: 'queued' });

    const charger = await connectAndBoot('WW-AWAY');
    const call = await charger.nextCall();
    expect(call).toMatchObject({
      action: 'ChangeAvailability',
      payload: { connectorId: 0, type: 'Inoperative' },
    });
    charger.reply(call, { status: 'Scheduled' });
    expect(
      await gateway.eventually(
        `select status from charger_commands where id = $1 and status = 'accepted'`,
        [waiting],
      ),
    ).toEqual({ status: 'accepted' });
    expect(await gateway.row('select status from charger_commands where id = $1', [stale])).toEqual(
      { status: 'expired' },
    );
    await charger.close();
  });

  it('sends load management’s power cap as a SetChargingProfile and takes it off with ClearChargingProfile', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-CAP');
    const charger = await connectAndBoot('WW-CAP');
    const cap = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'set_charging_profile',
      payload: { profile_id: 1700, limit_w: 7400 },
    });
    const setCall = await charger.nextCall();
    expect(setCall).toMatchObject({
      action: 'SetChargingProfile',
      payload: {
        connectorId: 0,
        csChargingProfiles: {
          chargingProfileId: 1700,
          chargingProfilePurpose: 'ChargePointMaxProfile',
          chargingSchedule: { chargingSchedulePeriod: [{ startPeriod: 0, limit: 7400 }] },
        },
      },
    });
    charger.reply(setCall, { status: 'Accepted' });
    expect(
      await gateway.eventually(
        `select status from charger_commands where id = $1 and status = 'accepted'`,
        [cap],
      ),
    ).toEqual({ status: 'accepted' });

    const clear = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'clear_charging_profile',
      payload: { profile_id: 1700 },
    });
    const clearCall = await charger.nextCall();
    expect(clearCall).toMatchObject({ action: 'ClearChargingProfile', payload: { id: 1700 } });
    charger.reply(clearCall, { status: 'Unknown' });
    expect(
      await gateway.eventually(
        `select status from charger_commands where id = $1 and status = 'accepted'`,
        [clear],
      ),
    ).toEqual({ status: 'accepted' });
    await charger.close();
  });
});
