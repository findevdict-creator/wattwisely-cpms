import { ManagedServiceErrors } from '../managed-service-errors';

/** A calendar month in UTC, from a "YYYY-MM" query value, for the monthly service report. */
export class ReportMonth {
  private constructor(
    readonly key: string,
    readonly from: Date,
    readonly to: Date,
  ) {}

  /** The month a report is for: the given one, or last month when none is given. */
  static parse(text: string | undefined, now: Date = new Date()): ReportMonth {
    const value = text ?? ReportMonth.previous(now);
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      throw ManagedServiceErrors.invalidMonth();
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const from = new Date(Date.UTC(year, month - 1, 1));
    if (month < 1 || month > 12 || from.getTime() > now.getTime()) {
      throw ManagedServiceErrors.invalidMonth();
    }
    return new ReportMonth(value, from, new Date(Date.UTC(year, month, 1)));
  }

  /** True once the month is over, so the report will not change any more. */
  isComplete(now: Date = new Date()): boolean {
    return this.to.getTime() <= now.getTime();
  }

  private static previous(now: Date): string {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
