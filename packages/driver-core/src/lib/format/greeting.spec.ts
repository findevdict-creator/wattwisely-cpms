import { Greeting } from './greeting';

describe('Greeting', () => {
  const at = (hour: number) => new Date(2026, 9, 29, hour, 30);

  it('greets by first name and the part of the day', () => {
    expect(Greeting.of('Dana Driver', at(8))).toBe('Good morning, Dana');
    expect(Greeting.of('Dana Driver', at(14))).toBe('Good afternoon, Dana');
    expect(Greeting.of('Dana Driver', at(19))).toBe('Good evening, Dana');
  });

  it('says evening late at night, and leaves the name out when there is none', () => {
    expect(Greeting.of('Dana', at(2))).toBe('Good evening, Dana');
    expect(Greeting.of('  ', at(9))).toBe('Good morning');
  });
});
