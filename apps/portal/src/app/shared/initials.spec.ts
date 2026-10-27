import { Initials } from './initials';

describe('Initials', () => {
  it('takes the first letter of each word and the capitals inside one', () => {
    expect(Initials.of('Acme Charging')).toBe('AC');
    expect(Initials.of('GreenPark Fleet')).toBe('GP');
    expect(Initials.of('VoltHub')).toBe('VH');
    expect(Initials.of('northline fleet')).toBe('NF');
  });

  it('falls back to the first two letters', () => {
    expect(Initials.of('Maya')).toBe('MA');
    expect(Initials.of('olivia@acme.test')).toBe('OL');
  });

  it('gives a company the same color each time', () => {
    expect(Initials.toneOf('t1')).toBe(Initials.toneOf('t1'));
    expect(Initials.TONES).toContain(Initials.toneOf('tenant-42'));
  });
});
