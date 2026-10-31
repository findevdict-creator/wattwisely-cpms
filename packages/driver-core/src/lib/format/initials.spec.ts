import { Initials } from './initials';

describe('Initials', () => {
  it('takes the capitals of a name, or its first two letters', () => {
    expect(Initials.of('Acme Charging')).toBe('AC');
    expect(Initials.of('GreenPark Fleet')).toBe('GP');
    expect(Initials.of('marco@mail.test')).toBe('MA');
  });
});
