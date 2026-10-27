import { HomePeriod } from './home-period';

describe('HomePeriod', () => {
  const now = new Date(2026, 9, 27, 10, 30);
  const ms = (iso: string) => new Date(iso).getTime();

  it('compares the last 7 days with the 7 before', () => {
    const { current, previous } = HomePeriod.ranges('7d', now);
    expect(ms(current.to)).toBe(now.getTime());
    expect(ms(current.to) - ms(current.from)).toBe(7 * HomePeriod.DAY_MS);
    expect(previous.to).toBe(current.from);
  });

  it('compares today so far with yesterday up to the same time', () => {
    const { current, previous } = HomePeriod.ranges('today', now);
    expect(ms(current.from)).toBe(new Date(2026, 9, 27).getTime());
    expect(ms(previous.from)).toBe(new Date(2026, 9, 26).getTime());
    expect(ms(previous.to)).toBe(new Date(2026, 9, 26, 10, 30).getTime());
  });

  it('splits the last days at midnight, today up to now', () => {
    const days = HomePeriod.lastDays(7, now);
    expect(days).toHaveLength(7);
    expect(ms(days[0].from)).toBe(new Date(2026, 9, 21).getTime());
    expect(ms(days[6].to)).toBe(now.getTime());
  });

  it('words a change against the previous period', () => {
    expect(HomePeriod.change(112, 100, '7d')).toEqual({
      text: '+12% on the previous 7 days',
      trend: 'up',
    });
    expect(HomePeriod.change(90, 100, 'today').trend).toBe('down');
    expect(HomePeriod.change(5, 0, '30d')).toEqual({ text: '', trend: 'none' });
  });

  it('greets by the time of day', () => {
    expect(HomePeriod.greeting(now)).toBe('Good morning');
    expect(HomePeriod.greeting(new Date(2026, 9, 27, 19))).toBe('Good evening');
  });
});
