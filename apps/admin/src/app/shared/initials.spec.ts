import { Initials } from './initials';

describe('Initials', () => {
  it('takes the capitals of a name, or its first two letters', () => {
    expect(Initials.of('Jordan Smith')).toBe('JS');
    expect(Initials.of('VoltHub')).toBe('VH');
    expect(Initials.of('maya@acme.test')).toBe('MA');
  });
});
