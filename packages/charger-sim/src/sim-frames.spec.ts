import { SimFrames } from './sim-frames';

describe('SimFrames', () => {
  it('decodes calls, results and errors from the server, and nothing else', () => {
    expect(SimFrames.decode('[2,"1","Reset",{"type":"Soft"}]')).toEqual({
      id: '1',
      call: { id: '1', action: 'Reset', payload: { type: 'Soft' } },
    });
    expect(SimFrames.decode('[3,"1",{"status":"Accepted"}]')).toEqual({
      id: '1',
      reply: { kind: 'result', payload: { status: 'Accepted' } },
    });
    expect(SimFrames.decode('[4,"1","GenericError","x",{}]')).toEqual({
      id: '1',
      reply: { kind: 'error', code: 'GenericError', description: 'x', details: {} },
    });
    expect(SimFrames.decode('nope')).toBeNull();
    expect(SimFrames.decode('[9,"1"]')).toBeNull();
  });

  it('encodes what a charger sends', () => {
    expect(SimFrames.call('1', 'Heartbeat', {})).toBe('[2,"1","Heartbeat",{}]');
    expect(SimFrames.result('1', { status: 'Accepted' })).toBe('[3,"1",{"status":"Accepted"}]');
    expect(SimFrames.error('1', 'InternalError', 'boom')).toBe('[4,"1","InternalError","boom",{}]');
  });
});
