import { ReportCalendar } from './report-calendar';

describe('ReportCalendar', () => {
  it('runs weekly reports at midnight starting Monday, in the schedule time zone', () => {
    // Wednesday 11 March 2026; London is on GMT until 29 March.
    expect(
      ReportCalendar.nextRun('weekly', 'Europe/London', new Date('2026-03-11T10:00:00Z')),
    ).toEqual(new Date('2026-03-16T00:00:00Z'));
    // A run exactly on the boundary moves to the next one.
    expect(ReportCalendar.nextRun('weekly', 'UTC', new Date('2026-03-16T00:00:00Z'))).toEqual(
      new Date('2026-03-23T00:00:00Z'),
    );
  });

  it('runs monthly reports on the 1st and reports on the month just ended', () => {
    const run = ReportCalendar.nextRun(
      'monthly',
      'Europe/Berlin',
      new Date('2026-06-15T12:00:00Z'),
    );
    expect(run).toEqual(new Date('2026-06-30T22:00:00Z'));
    expect(ReportCalendar.periodBefore('monthly', 'Europe/Berlin', run)).toEqual({
      from: new Date('2026-05-31T22:00:00Z'),
      to: new Date('2026-06-30T22:00:00Z'),
    });
  });

  it('reports on the seven days before a weekly run', () => {
    expect(ReportCalendar.periodBefore('weekly', 'UTC', new Date('2026-03-16T00:00:00Z'))).toEqual({
      from: new Date('2026-03-09T00:00:00Z'),
      to: new Date('2026-03-16T00:00:00Z'),
    });
  });
});
