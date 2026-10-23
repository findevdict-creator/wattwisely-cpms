import { ReportRange } from './report-range';

describe('ReportRange', () => {
  const now = new Date(2026, 2, 15, 14, 30);

  it('counts the last days up to the end of today', () => {
    const range = ReportRange.of('last_7_days', now);
    expect(new Date(range.from)).toEqual(new Date(2026, 2, 9));
    expect(new Date(range.to)).toEqual(new Date(2026, 2, 16));
  });

  it('covers this month so far and the whole of last month', () => {
    expect(new Date(ReportRange.of('this_month', now).from)).toEqual(new Date(2026, 2, 1));
    const lastMonth = ReportRange.of('last_month', now);
    expect(new Date(lastMonth.from)).toEqual(new Date(2026, 1, 1));
    expect(new Date(lastMonth.to)).toEqual(new Date(2026, 2, 1));
  });

  it('goes back across a year end', () => {
    const lastMonth = ReportRange.of('last_month', new Date(2026, 0, 10));
    expect(new Date(lastMonth.from)).toEqual(new Date(2025, 11, 1));
  });

  it('names files by local dates', () => {
    expect(ReportRange.fileName('usage', ReportRange.of('last_month', now))).toBe(
      'usage-2026-02-01-to-2026-03-01.csv',
    );
  });
});
