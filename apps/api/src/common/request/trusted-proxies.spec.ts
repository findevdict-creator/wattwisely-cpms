import { TrustedProxies } from './trusted-proxies';

describe('TrustedProxies', () => {
  it('believes no proxy by default', () => {
    expect(TrustedProxies.forHops(0)).toBe(false);
    expect(TrustedProxies.forHops(Number('nonsense'))).toBe(false);
  });

  it('believes only as many hops as there are proxies', () => {
    const test = TrustedProxies.forHops(1) as (address: string, hop: number) => boolean;

    expect(test('172.18.0.2', 0)).toBe(true);
    expect(test('203.0.113.9', 1)).toBe(false);
  });
});
