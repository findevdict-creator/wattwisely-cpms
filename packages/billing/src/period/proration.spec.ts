import { BillingPeriod } from './billing-period';
import { Proration } from './proration';

describe('Proration', () => {
  const september = BillingPeriod.of(2026, 9);

  it('counts the whole month for something in force throughout', () => {
    const span = Proration.daysOf(september, new Date('2026-03-01T00:00:00Z'), null);

    expect(span).toEqual({ days: 30, fromDay: 1, toDay: 30 });
    expect(Proration.amount(29_900, span, september)).toBe(29_900);
    expect(Proration.suffix(span, september)).toBe('');
  });

  it('counts the days from a start in the month, the first day included', () => {
    const span = Proration.daysOf(september, new Date('2026-09-12T10:30:00Z'), null);

    expect(span).toEqual({ days: 19, fromDay: 12, toDay: 30 });
    expect(Proration.amount(30_000, span, september)).toBe(19_000);
    expect(Proration.suffix(span, september)).toBe(', 12–30 September (19 of 30 days)');
  });

  it('counts the days up to an end in the month; a day counts when any part of it is covered', () => {
    const atMidnight = Proration.daysOf(september, null, new Date('2026-09-10T00:00:00Z'));
    const inTheMorning = Proration.daysOf(september, null, new Date('2026-09-10T08:00:00Z'));

    expect(atMidnight).toEqual({ days: 9, fromDay: 1, toDay: 9 });
    expect(inTheMorning).toEqual({ days: 10, fromDay: 1, toDay: 10 });
    expect(Proration.amount(30_000, inTheMorning, september)).toBe(10_000);
  });

  it('gives no days to something that started after the month or ended before it', () => {
    expect(Proration.daysOf(september, new Date('2026-10-01T00:00:00Z'), null).days).toBe(0);
    expect(Proration.daysOf(september, null, new Date('2026-08-31T23:59:59Z')).days).toBe(0);
    expect(Proration.daysOf(september, null, new Date('2026-09-01T00:00:00Z')).days).toBe(0);
  });

  it('overlaps two spans, e.g. an add-on within the plan', () => {
    const plan = Proration.daysOf(september, new Date('2026-09-05T00:00:00Z'), null);
    const addon = Proration.daysOf(september, null, new Date('2026-09-20T12:00:00Z'));

    expect(Proration.overlap(plan, addon)).toEqual({ days: 16, fromDay: 5, toDay: 20 });
    expect(Proration.overlap(plan, { days: 0, fromDay: 0, toDay: 0 }).days).toBe(0);
    expect(Proration.suffix({ days: 1, fromDay: 7, toDay: 7 }, september)).toBe(
      ', 7 September (1 of 30 days)',
    );
  });
});
