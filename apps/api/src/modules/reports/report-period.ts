import { ReportErrors } from './report-errors';

/** A report period from a query: from before to, at most a year long. */
export class ReportPeriod {
  static readonly DAY_MS = 86_400_000;

  static of(from: string, to: string): { from: Date; to: Date } {
    const start = new Date(from);
    const end = new Date(to);
    const length = end.getTime() - start.getTime();
    if (!(length > 0) || length > ReportErrors.MAX_DAYS * ReportPeriod.DAY_MS) {
      throw ReportErrors.invalidPeriod();
    }
    return { from: start, to: end };
  }
}
