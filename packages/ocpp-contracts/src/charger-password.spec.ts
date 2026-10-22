import { ChargerPassword } from './charger-password';

describe('ChargerPassword', () => {
  it('generates 24 unambiguous characters', () => {
    const password = ChargerPassword.generate();

    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{24}$/);
    expect(ChargerPassword.generate()).not.toEqual(password);
  });

  it('stores a salted hash that only the right password matches', () => {
    const password = ChargerPassword.generate();
    const stored = ChargerPassword.hash(password);

    expect(stored).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(stored).not.toContain(password);
    expect(ChargerPassword.hash(password)).not.toEqual(stored);
    expect(ChargerPassword.matches(password, stored)).toBe(true);
    expect(ChargerPassword.matches(`${password}x`, stored)).toBe(false);
    expect(ChargerPassword.matches(password, 'plain')).toBe(false);
  });
});
