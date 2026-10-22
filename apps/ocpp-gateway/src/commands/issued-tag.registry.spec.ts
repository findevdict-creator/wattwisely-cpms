import { IssuedTagRegistry } from './issued-tag.registry';

describe('IssuedTagRegistry', () => {
  it('knows a tag for its lifetime, per charger, and hands out its command once', () => {
    const registry = new IssuedTagRegistry();
    registry.issue('ch1', 'WW1', 'cmd1', 1000);
    expect(registry.isIssued('ch1', 'WW1', 1000 + IssuedTagRegistry.TTL_MS - 1)).toBe(true);
    expect(registry.isIssued('ch2', 'WW1', 1000)).toBe(false);
    expect(registry.isIssued('ch1', 'WW1', 1000 + IssuedTagRegistry.TTL_MS + 1)).toBe(false);

    registry.issue('ch1', 'WW2', 'cmd2', 1000);
    expect(registry.take('ch1', 'WW2', 2000)).toBe('cmd2');
    expect(registry.take('ch1', 'WW2', 2000)).toBeNull();
    expect(registry.isIssued('ch1', 'WW2', 2000)).toBe(false);
  });
});
