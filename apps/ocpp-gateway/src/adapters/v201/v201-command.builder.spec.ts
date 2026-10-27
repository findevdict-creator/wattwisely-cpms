import { GatewayCommand } from '../../storage/gateway-commands.repository';
import { V201CommandBuilder } from './v201-command.builder';

describe('V201CommandBuilder', () => {
  const command = (action: GatewayCommand['action'], payload: object): GatewayCommand => ({
    id: '0192a7b3-4c5d-7e6f-8a9b-0c1d2e3f4a5b',
    tenantId: 't1',
    chargerId: 'ch1',
    action,
    payload: payload as GatewayCommand['payload'],
    status: 'queued',
    queuedUntil: new Date(),
  });

  it('turns each command into its OCPP 2.0.1 call', () => {
    expect(
      V201CommandBuilder.toCall(command('remote_start', { ocpp_connector_id: 2, id_tag: 'WW1' })),
    ).toEqual({
      action: 'RequestStartTransaction',
      payload: {
        evseId: 2,
        remoteStartId: V201CommandBuilder.remoteStartIdOf('0192a7b3-4c5d-7e6f-8a9b-0c1d2e3f4a5b'),
        idToken: { idToken: 'WW1', type: 'Central' },
      },
    });
    expect(
      V201CommandBuilder.toCall(
        command('remote_stop', { ocpp_transaction_id: 1001, session_id: 's' }),
        'TX-9',
      ),
    ).toEqual({ action: 'RequestStopTransaction', payload: { transactionId: 'TX-9' } });
    expect(
      V201CommandBuilder.toCall(
        command('remote_stop', { ocpp_transaction_id: 1001, session_id: 's' }),
      ).payload,
    ).toEqual({ transactionId: '1001' });
    expect(V201CommandBuilder.toCall(command('reset', { type: 'Soft' })).payload).toEqual({
      type: 'OnIdle',
    });
    expect(V201CommandBuilder.toCall(command('reset', { type: 'Hard' })).payload).toEqual({
      type: 'Immediate',
    });
    expect(V201CommandBuilder.toCall(command('unlock', { ocpp_connector_id: 1 }))).toEqual({
      action: 'UnlockConnector',
      payload: { evseId: 1, connectorId: 1 },
    });
    expect(
      V201CommandBuilder.toCall(
        command('change_availability', { ocpp_connector_id: 0, type: 'Operative' }),
      ).payload,
    ).toEqual({ operationalStatus: 'Operative' });
    expect(
      V201CommandBuilder.toCall(
        command('change_availability', { ocpp_connector_id: 2, type: 'Inoperative' }),
      ).payload,
    ).toEqual({ operationalStatus: 'Inoperative', evse: { id: 2 } });
  });

  it('turns a power cap into a ChargingStationMaxProfile on the whole station, and its removal into a clear by id', () => {
    expect(
      V201CommandBuilder.toCall(
        command('set_charging_profile', { profile_id: 1700, limit_w: 7400 }),
      ),
    ).toEqual({
      action: 'SetChargingProfile',
      payload: {
        evseId: 0,
        chargingProfile: {
          id: 1700,
          stackLevel: 0,
          chargingProfilePurpose: 'ChargingStationMaxProfile',
          chargingProfileKind: 'Absolute',
          chargingSchedule: [
            {
              id: 1,
              chargingRateUnit: 'W',
              chargingSchedulePeriod: [{ startPeriod: 0, limit: 7400 }],
            },
          ],
        },
      },
    });
    expect(
      V201CommandBuilder.toCall(command('clear_charging_profile', { profile_id: 1700 })),
    ).toEqual({ action: 'ClearChargingProfile', payload: { chargingProfileId: 1700 } });
  });

  it('reads the station reply as accepted, rejected, failed or timed out, and makes a stable remoteStartId', () => {
    expect(
      V201CommandBuilder.toOutcome({ kind: 'result', payload: { status: 'Scheduled' } }),
    ).toMatchObject({ status: 'accepted', error: null });
    expect(
      V201CommandBuilder.toOutcome({ kind: 'result', payload: { status: 'UnknownConnector' } }),
    ).toMatchObject({ status: 'rejected', error: 'The charger answered UnknownConnector.' });
    expect(
      V201CommandBuilder.toOutcome({
        kind: 'error',
        code: 'NotSupported',
        description: 'no',
        details: {},
      }),
    ).toMatchObject({ status: 'failed', error: 'NotSupported: no' });
    expect(V201CommandBuilder.toOutcome({ kind: 'timeout' })).toMatchObject({
      status: 'timed_out',
    });
    expect(V201CommandBuilder.toOutcome({ kind: 'closed' })).toMatchObject({ status: 'failed' });
    const id = V201CommandBuilder.remoteStartIdOf('0192a7b3-4c5d-7e6f-8a9b-0c1d2e3f4a5b');
    expect(id).toBe(V201CommandBuilder.remoteStartIdOf('0192a7b3-4c5d-7e6f-8a9b-0c1d2e3f4a5b'));
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThan(2 ** 31);
  });
});
