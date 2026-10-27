import { ChargerMessages201, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { TestGateway } from '../../testing/test-gateway';

/** Commands to a 2.0.1 station: the same rows and notifications, 2.0.1 words on the wire. */
(TestDatabase.isConfigured() ? describe : describe.skip)('OCPP 2.0.1 commands', () => {
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
    const charger = gateway.charger(identity, { protocols: ChargerMessages201.PROTOCOLS });
    await charger.connect();
    await new ChargerMessages201(charger).boot();
    return charger;
  };

  const settled = (commandId: string) =>
    gateway.eventually(
      `select status, error from charger_commands where id = $1 and status not in ('queued', 'sent')`,
      [commandId],
    );

  it('starts a charge with a Central token the station echoes, and stops it by the id the station chose', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-RSTART');
    const charger = await connectAndBoot('WW-RSTART');
    const messages = new ChargerMessages201(charger);
    expect((await messages.authorize('WW-STRANGER')).idTokenInfo.status).toBe('Invalid');

    const start = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'remote_start',
      payload: { ocpp_connector_id: 1, id_tag: 'WWABC123' },
    });
    const call = await charger.nextCall();
    expect(call).toMatchObject({
      action: 'RequestStartTransaction',
      payload: { evseId: 1, idToken: { idToken: 'WWABC123', type: 'Central' } },
    });
    expect((call.payload as { remoteStartId: number }).remoteStartId).toBeGreaterThan(0);
    charger.reply(call, { status: 'Accepted' });
    expect(await settled(start)).toEqual({ status: 'accepted', error: null });

    const started = await messages.transactionStarted('TX-R', {
      idToken: 'WWABC123',
      meterWh: 0,
      triggerReason: 'RemoteStart',
    });
    expect(started).toEqual({ idTokenInfo: { status: 'Accepted' } });
    const session = await gateway.eventually(
      `select id, command_id from charging_sessions where charger_id = $1 and ocpp_transaction_ref = 'TX-R'`,
      [chargerId],
    );
    expect(session['command_id']).toBe(start);

    const stop = await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'remote_stop',
      payload: { ocpp_transaction_id: 1, session_id: session['id'] },
    });
    const stopCall = await charger.nextCall();
    expect(stopCall).toEqual({
      id: stopCall.id,
      action: 'RequestStopTransaction',
      payload: { transactionId: 'TX-R' },
    });
    charger.reply(stopCall, { status: 'Rejected' });
    expect(await settled(stop)).toEqual({
      status: 'rejected',
      error: 'The charger answered Rejected.',
    });
    await charger.close();
  });

  it('says reset, unlock, availability and the power cap in 2.0.1 words', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-WORDS2');
    const charger = await connectAndBoot('WW-WORDS2');
    const expectCall = async (
      action: string,
      payload: object,
      expected: { action: string; payload: object },
      answer: object,
    ) => {
      const id = await gateway.queueCommand({ tenantId: acme, chargerId, action, payload });
      const call = await charger.nextCall();
      expect(call).toMatchObject(expected);
      charger.reply(call, answer);
      return settled(id);
    };

    expect(
      await expectCall(
        'reset',
        { type: 'Soft' },
        { action: 'Reset', payload: { type: 'OnIdle' } },
        {
          status: 'Scheduled',
        },
      ),
    ).toEqual({ status: 'accepted', error: null });
    expect(
      await expectCall(
        'unlock',
        { ocpp_connector_id: 2 },
        { action: 'UnlockConnector', payload: { evseId: 2, connectorId: 1 } },
        { status: 'UnlockFailed' },
      ),
    ).toEqual({ status: 'rejected', error: 'The charger answered UnlockFailed.' });
    expect(
      await expectCall(
        'change_availability',
        { ocpp_connector_id: 0, type: 'Inoperative' },
        { action: 'ChangeAvailability', payload: { operationalStatus: 'Inoperative' } },
        { status: 'Accepted' },
      ),
    ).toEqual({ status: 'accepted', error: null });
    expect(
      await expectCall(
        'set_charging_profile',
        { profile_id: 1700, limit_w: 7400 },
        {
          action: 'SetChargingProfile',
          payload: {
            evseId: 0,
            chargingProfile: {
              id: 1700,
              chargingProfilePurpose: 'ChargingStationMaxProfile',
              chargingSchedule: [{ chargingSchedulePeriod: [{ startPeriod: 0, limit: 7400 }] }],
            },
          },
        },
        { status: 'Accepted' },
      ),
    ).toEqual({ status: 'accepted', error: null });
    expect(
      await expectCall(
        'clear_charging_profile',
        { profile_id: 1700 },
        { action: 'ClearChargingProfile', payload: { chargingProfileId: 1700 } },
        { status: 'Unknown' },
      ),
    ).toEqual({ status: 'accepted', error: null });
    await charger.close();
  });
});
