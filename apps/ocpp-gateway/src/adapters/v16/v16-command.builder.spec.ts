import { GatewayCommand } from '../../storage/gateway-commands.repository';
import { V16CommandBuilder } from './v16-command.builder';

describe('V16CommandBuilder', () => {
  const command = (action: GatewayCommand['action'], payload: object): GatewayCommand => ({
    id: 'c1',
    tenantId: 't1',
    chargerId: 'ch1',
    action,
    payload: payload as GatewayCommand['payload'],
    status: 'queued',
    queuedUntil: new Date(),
  });

  it('turns each command into its OCPP 1.6 call', () => {
    expect(
      V16CommandBuilder.toCall(command('remote_start', { ocpp_connector_id: 2, id_tag: 'WW1' })),
    ).toEqual({
      action: 'RemoteStartTransaction',
      payload: { connectorId: 2, idTag: 'WW1' },
    });
    expect(
      V16CommandBuilder.toCall(
        command('remote_stop', { ocpp_transaction_id: 1001, session_id: 's' }),
      ),
    ).toEqual({
      action: 'RemoteStopTransaction',
      payload: { transactionId: 1001 },
    });
    expect(V16CommandBuilder.toCall(command('reset', { type: 'Soft' }))).toEqual({
      action: 'Reset',
      payload: { type: 'Soft' },
    });
    expect(V16CommandBuilder.toCall(command('unlock', { ocpp_connector_id: 1 }))).toEqual({
      action: 'UnlockConnector',
      payload: { connectorId: 1 },
    });
    expect(
      V16CommandBuilder.toCall(
        command('change_availability', { ocpp_connector_id: 0, type: 'Operative' }),
      ),
    ).toEqual({
      action: 'ChangeAvailability',
      payload: { connectorId: 0, type: 'Operative' },
    });
  });

  it('reads the charger reply as accepted, rejected, failed or timed out', () => {
    expect(
      V16CommandBuilder.toOutcome({ kind: 'result', payload: { status: 'Accepted' } }),
    ).toMatchObject({ status: 'accepted', error: null });
    expect(
      V16CommandBuilder.toOutcome({ kind: 'result', payload: { status: 'Unlocked' } }),
    ).toMatchObject({ status: 'accepted' });
    expect(
      V16CommandBuilder.toOutcome({ kind: 'result', payload: { status: 'UnlockFailed' } }),
    ).toMatchObject({
      status: 'rejected',
      error: 'The charger answered UnlockFailed.',
    });
    expect(V16CommandBuilder.toOutcome({ kind: 'result', payload: {} })).toMatchObject({
      status: 'rejected',
    });
    expect(
      V16CommandBuilder.toOutcome({
        kind: 'error',
        code: 'NotSupported',
        description: 'no',
        details: {},
      }),
    ).toMatchObject({
      status: 'failed',
      error: 'NotSupported: no',
    });
    expect(V16CommandBuilder.toOutcome({ kind: 'timeout' })).toMatchObject({ status: 'timed_out' });
    expect(V16CommandBuilder.toOutcome({ kind: 'closed' })).toMatchObject({ status: 'failed' });
  });
});
