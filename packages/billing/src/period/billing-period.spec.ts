import { BillingPeriod } from './billing-period';

describe('BillingPeriod', () => {
  it('reads and writes the month key, and knows its days and label', () => {
    const period = BillingPeriod.parse('2026-02') as BillingPeriod;

    expect(period.key).toBe('2026-02');
    expect(period.firstDay).toBe('2026-02-01');
    expect(period.lastDay).toBe('2026-02-28');
    expect(period.days).toBe(28);
    expect(period.label).toBe('February 2026');
    expect(period.to.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(BillingPeriod.parse('2026-13')).toBeNull();
    expect(BillingPeriod.parse('September')).toBeNull();
  });

  it('finds the month before a date, across the year end', () => {
    expect(BillingPeriod.before(new Date('2026-01-15T10:00:00Z')).key).toBe('2025-12');
    expect(BillingPeriod.before(new Date('2026-10-01T00:00:00Z')).key).toBe('2026-09');
    expect(BillingPeriod.of(2024, 2).days).toBe(29);
  });

  it('can be invoiced only once it is over', () => {
    const september = BillingPeriod.of(2026, 9);

    expect(september.hasEnded(new Date('2026-09-30T23:59:59Z'))).toBe(false);
    expect(september.hasEnded(new Date('2026-10-01T00:00:00Z'))).toBe(true);
  });
});
