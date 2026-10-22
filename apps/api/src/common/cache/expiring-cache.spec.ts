import { ExpiringCache } from './expiring-cache';

describe('ExpiringCache', () => {
  it('returns a value until it expires', () => {
    const cache = new ExpiringCache<string>(1000);
    cache.set('a', 'value', 0);

    expect(cache.get('a', 999)).toBe('value');
    expect(cache.get('a', 1000)).toBeUndefined();
  });

  it('forgets every key with a prefix', () => {
    const cache = new ExpiringCache<string>(1000);
    cache.set('user-1:tenant-1', 'x', 0);
    cache.set('user-1:tenant-2', 'y', 0);
    cache.set('user-2:tenant-1', 'z', 0);

    cache.deleteByPrefix('user-1:');

    expect(cache.get('user-1:tenant-1', 1)).toBeUndefined();
    expect(cache.get('user-1:tenant-2', 1)).toBeUndefined();
    expect(cache.get('user-2:tenant-1', 1)).toBe('z');
  });
});
