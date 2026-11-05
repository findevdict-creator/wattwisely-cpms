import { Charger, Connector } from '../../core/api/models/charger';
import { ChargerCommandRules } from './charger-command.rules';
import { OcppVersionLabel } from './ocpp-version-label';

describe('ChargerCommandRules', () => {
  const charger = (isOnline: boolean) => ({ id: 'ch1', is_online: isOnline }) as unknown as Charger;
  const connector = (status: string, sessionStatus: string | null = null) =>
    ({
      id: 'c1',
      status,
      active_session: sessionStatus ? { id: 's1', status: sessionStatus } : null,
    }) as unknown as Connector;

  it('sends commands only to a charger that is online, in an account that is not suspended', () => {
    expect(ChargerCommandRules.blockedReason(charger(true), false)).toBeNull();
    expect(ChargerCommandRules.blockedReason(charger(false), false)).toMatch(/offline/);
    expect(ChargerCommandRules.blockedReason(charger(true), true)).toMatch(/suspended/);
  });

  it('starts a charge on a free connector and stops one that runs', () => {
    expect(ChargerCommandRules.canStart(connector('available'))).toBe(true);
    expect(ChargerCommandRules.canStart(connector('preparing'))).toBe(true);
    expect(ChargerCommandRules.canStart(connector('faulted'))).toBe(false);
    expect(ChargerCommandRules.canStart(connector('charging', 'charging'))).toBe(false);
    expect(ChargerCommandRules.canStart(null)).toBe(false);

    expect(ChargerCommandRules.canStop(connector('charging', 'charging'))).toBe(true);
    expect(ChargerCommandRules.canStop(connector('finishing', 'stopping'))).toBe(false);
    expect(ChargerCommandRules.canStop(connector('available'))).toBe(false);
  });
});

describe('OcppVersionLabel', () => {
  it('names the JSON flavour of 1.6 and leaves an unknown version out', () => {
    expect(OcppVersionLabel.of('1.6')).toBe('OCPP 1.6J');
    expect(OcppVersionLabel.of('2.0.1')).toBe('OCPP 2.0.1');
    expect(OcppVersionLabel.of(null)).toBeNull();
  });
});
