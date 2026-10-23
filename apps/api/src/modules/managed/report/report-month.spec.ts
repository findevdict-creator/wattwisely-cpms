import { ReportMonth } from './report-month';

describe('ReportMonth', () => {
  const now = new Date('2026-05-15T12:00:00Z');

  it('defaults to last month and knows when a month is over', () => {
    const month = ReportMonth.parse(undefined, now);
    expect(month.key).toBe('2026-04');
    expect(month.from.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(month.to.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(month.isComplete(now)).toBe(true);
    expect(ReportMonth.parse('2026-05', now).isComplete(now)).toBe(false);
  });

  it('refuses nonsense and the future', () => {
    expect(() => ReportMonth.parse('2026-13', now)).toThrow(/month must look like/);
    expect(() => ReportMonth.parse('2026-06', now)).toThrow(/month must look like/);
    expect(() => ReportMonth.parse('last', now)).toThrow(/month must look like/);
  });
});
