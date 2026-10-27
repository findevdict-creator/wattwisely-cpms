import { OcppVersions } from './ocpp-version';

describe('OcppVersions', () => {
  it('maps each version to its subprotocol and back', () => {
    expect(OcppVersions.subprotocolOf('1.6')).toBe('ocpp1.6');
    expect(OcppVersions.subprotocolOf('2.0.1')).toBe('ocpp2.0.1');
    expect(OcppVersions.fromSubprotocol('ocpp2.0.1')).toBe('2.0.1');
    expect(OcppVersions.fromSubprotocol('ocpp1.6')).toBe('1.6');
    expect(OcppVersions.fromSubprotocol('ocpp2.1')).toBeNull();
  });
});
