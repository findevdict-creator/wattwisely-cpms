import { OcppCallError } from './ocpp-call-error';
import { OcppFrameCodec } from './ocpp-frame-codec';

describe('OcppFrameCodec', () => {
  it('decodes the three OCPP-J frame types', () => {
    expect(OcppFrameCodec.decode('[2,"1","Heartbeat",{}]')).toEqual({
      type: 'call',
      id: '1',
      action: 'Heartbeat',
      payload: {},
    });
    expect(OcppFrameCodec.decode('[3,"1",{"a":1}]')).toEqual({
      type: 'call_result',
      id: '1',
      payload: { a: 1 },
    });
    expect(OcppFrameCodec.decode('[4,"1","NotImplemented","nope",{}]')).toEqual({
      type: 'call_error',
      id: '1',
      code: 'NotImplemented',
      description: 'nope',
      details: {},
    });
  });

  it('refuses anything else as a FormationViolation', () => {
    for (const text of [
      'not json',
      '{}',
      '[2]',
      '[2,"1"]',
      '[5,"1",{}]',
      '[2,"1","Heartbeat"]',
      '[3,"1"]',
    ]) {
      expect(() => OcppFrameCodec.decode(text)).toThrow(OcppCallError);
      expect(() => OcppFrameCodec.decode(text)).toThrow(/FormationViolation/);
    }
  });

  it('finds the id of a frame that could not be decoded, when there is one', () => {
    expect(OcppFrameCodec.idOf('[2,"abc","Heartbeat"]')).toBe('abc');
    expect(OcppFrameCodec.idOf('[2,7,"Heartbeat",{}]')).toBeNull();
    expect(OcppFrameCodec.idOf('garbage')).toBeNull();
  });

  it('encodes calls, results and errors', () => {
    expect(OcppFrameCodec.encodeCall('9', 'Reset', { type: 'Soft' })).toBe(
      '[2,"9","Reset",{"type":"Soft"}]',
    );
    expect(OcppFrameCodec.encodeResult('9', {})).toBe('[3,"9",{}]');
    expect(OcppFrameCodec.encodeError('9', new OcppCallError('GenericError', 'x', { f: 1 }))).toBe(
      '[4,"9","GenericError","x",{"f":1}]',
    );
  });

  it('spells the two renamed error codes the way the charger version does', () => {
    const formation = new OcppCallError('FormationViolation', 'x');
    expect(OcppFrameCodec.encodeError('9', formation, '1.6')).toContain('"FormationViolation"');
    expect(OcppFrameCodec.encodeError('9', formation, '2.0.1')).toContain('"FormatViolation"');
    expect(new OcppCallError('OccurenceConstraintViolation', 'x').codeFor('2.0.1')).toBe(
      'OccurrenceConstraintViolation',
    );
    expect(new OcppCallError('TypeConstraintViolation', 'x').codeFor('2.0.1')).toBe(
      'TypeConstraintViolation',
    );
  });
});
