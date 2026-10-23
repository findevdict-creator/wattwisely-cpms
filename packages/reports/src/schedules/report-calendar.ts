import { LocalClock, LocalDate } from '@wattwisely/pricing';

/** How often a scheduled report goes out (PRD, Reports: scheduled e-mail on the advanced plan). */
export type ReportFrequency = 'weekly' | 'monthly';

/**
 * When scheduled reports run, in the schedule's time zone: weekly at midnight starting
 * Monday, monthly at midnight on the 1st. Each run covers the week or month just ended.
 */
export class ReportCalendar {
  static readonly DAY_MS = 86_400_000;

  /** The first run strictly after `after`. */
  static nextRun(frequency: ReportFrequency, timeZone: string, after: Date): Date {
    const clock = new LocalClock(timeZone);
    let date = ReportCalendar.startOf(frequency, clock.partsOf(after));
    let run = clock.toInstant(date, 0);
    while (run.getTime() <= after.getTime()) {
      date = ReportCalendar.step(frequency, date, 1);
      run = clock.toInstant(date, 0);
    }
    return run;
  }

  /** The period a run at `runAt` reports on: the week or month that ended then. */
  static periodBefore(frequency: ReportFrequency, timeZone: string, runAt: Date) {
    const clock = new LocalClock(timeZone);
    const end = ReportCalendar.startOf(frequency, clock.partsOf(runAt));
    return {
      from: clock.toInstant(ReportCalendar.step(frequency, end, -1), 0),
      to: clock.toInstant(end, 0),
    };
  }

  /** The local date of the Monday, or the 1st, on or before this date. */
  private static startOf(frequency: ReportFrequency, date: LocalDate): LocalDate {
    if (frequency === 'monthly') {
      return { year: date.year, month: date.month, day: 1 };
    }
    const utc = new Date(Date.UTC(date.year, date.month - 1, date.day));
    const sinceMonday = (utc.getUTCDay() + 6) % 7;
    return ReportCalendar.toDate(new Date(utc.getTime() - sinceMonday * ReportCalendar.DAY_MS));
  }

  private static step(frequency: ReportFrequency, date: LocalDate, count: number): LocalDate {
    if (frequency === 'monthly') {
      return ReportCalendar.toDate(new Date(Date.UTC(date.year, date.month - 1 + count, 1)));
    }
    const utc = Date.UTC(date.year, date.month - 1, date.day) + count * 7 * ReportCalendar.DAY_MS;
    return ReportCalendar.toDate(new Date(utc));
  }

  private static toDate(utc: Date): LocalDate {
    return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
  }
}
