/** The months a service report can be asked for, as a month input ("2026-05") wants them. */
export class ReportMonth {
  /** The previous month: the latest one the report covers in full. */
  static previous(now: Date = new Date()): string {
    return ReportMonth.key(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  /** The current month, the latest the report accepts. */
  static current(now: Date = new Date()): string {
    return ReportMonth.key(now);
  }

  /** "May 2026" for "2026-05". */
  static label(key: string): string {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  private static key(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
