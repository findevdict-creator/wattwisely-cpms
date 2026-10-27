import { ReportMonth } from './report-month';

describe('ReportMonth', () => {
  it('names the previous and the current month', () => {
    const now = new Date(2026, 0, 15);

    expect(ReportMonth.previous(now)).toBe('2025-12');
    expect(ReportMonth.current(now)).toBe('2026-01');
  });

  it('labels a month for people', () => {
    expect(ReportMonth.label('2026-05')).toContain('2026');
  });
});
