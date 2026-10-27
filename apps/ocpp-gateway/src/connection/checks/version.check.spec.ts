import { ChargerIdentity } from '../../storage/charger-identity';
import { UpgradeRequest } from '../upgrade-request';
import { VersionCheck } from './version.check';

describe('VersionCheck', () => {
  const check = new VersionCheck();
  const charger = (ocppVersion: ChargerIdentity['ocppVersion']): ChargerIdentity => ({
    id: 'c1',
    tenantId: 't1',
    identity: 'WW-1',
    authMode: 'none',
    passwordHash: null,
    allowPlainWs: false,
    ocppVersion,
    bootFingerprint: null,
    heartbeatIntervalS: null,
    registrationStatus: null,
  });
  const request = (protocols: string[]) =>
    new UpgradeRequest({
      identity: 'WW-1',
      ip: '10.0.0.1',
      isSecure: true,
      protocols,
      authorization: null,
    });

  it('takes the first subprotocol the charger offers that the gateway speaks', () => {
    expect(check.check(request(['ocpp1.6']), charger(null))).toBe('1.6');
    expect(check.check(request(['ocpp2.0.1']), charger(null))).toBe('2.0.1');
    expect(check.check(request(['ocpp2.0.1', 'ocpp1.6']), charger('1.6'))).toBe('2.0.1');
    expect(check.check(request(['ocpp2.1', 'ocpp1.6']), charger(null))).toBe('1.6');
  });

  it('takes a charger that offers nothing at the version it last spoke, and refuses the rest', () => {
    expect(check.check(request([]), charger('2.0.1'))).toBe('2.0.1');
    expect(() => check.check(request([]), charger(null))).toThrow(/unsupported_protocol/);
    expect(() => check.check(request(['ocpp2.1']), charger('1.6'))).toThrow(/unsupported_protocol/);
  });
});
