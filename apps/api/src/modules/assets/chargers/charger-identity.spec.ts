import { ChargerIdentity } from './charger-identity';

describe('ChargerIdentity', () => {
  it('generates WW- plus 10 Crockford Base32 characters, different every time', () => {
    const first = ChargerIdentity.generate();
    const second = ChargerIdentity.generate();

    expect(first).toMatch(/^WW-[0-9A-HJKMNP-TV-Z]{10}$/);
    expect(first).not.toEqual(second);
  });

  it('accepts a charger’s own URL-safe identity and refuses the rest', () => {
    expect(ChargerIdentity.isValid('SN-AB129934')).toBe(true);
    expect(ChargerIdentity.isValid('cp_01.east')).toBe(true);
    expect(ChargerIdentity.isValid('CP 01')).toBe(false);
    expect(ChargerIdentity.isValid('cp/01')).toBe(false);
    expect(ChargerIdentity.isValid('')).toBe(false);
    expect(ChargerIdentity.isValid('x'.repeat(49))).toBe(false);
  });

  it('calls short identities weak', () => {
    expect(ChargerIdentity.isStrong('CP001')).toBe(false);
    expect(ChargerIdentity.isStrong('WW-7KQ4M2XR9T')).toBe(true);
  });
});
