import { Ocpp201Status } from './ocpp201-status';

describe('Ocpp201Status', () => {
  it('translates the five connector statuses, and anything else to unknown', () => {
    expect(Ocpp201Status.toConnectorStatus('Available')).toBe('available');
    expect(Ocpp201Status.toConnectorStatus('Occupied')).toBe('occupied');
    expect(Ocpp201Status.toConnectorStatus('Reserved')).toBe('reserved');
    expect(Ocpp201Status.toConnectorStatus('Unavailable')).toBe('unavailable');
    expect(Ocpp201Status.toConnectorStatus('Faulted')).toBe('faulted');
    expect(Ocpp201Status.toConnectorStatus('Charging')).toBe('unknown');
  });

  it('reads a charging state as the connector status it implies', () => {
    expect(Ocpp201Status.fromChargingState('Charging', false)).toBe('charging');
    expect(Ocpp201Status.fromChargingState('SuspendedEV', false)).toBe('suspended_ev');
    expect(Ocpp201Status.fromChargingState('SuspendedEVSE', false)).toBe('suspended_evse');
    expect(Ocpp201Status.fromChargingState('EVConnected', false)).toBe('preparing');
    expect(Ocpp201Status.fromChargingState('EVConnected', true)).toBe('finishing');
    expect(Ocpp201Status.fromChargingState('Idle', true)).toBeNull();
  });
});
