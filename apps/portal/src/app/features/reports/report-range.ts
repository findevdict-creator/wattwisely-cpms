/** The periods the Reports page offers. */
export type ReportRangeKey = 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month';

/** A period in the browser's local time, as the ISO times the API takes (to is exclusive). */
export class ReportRange {
  static readonly LABELS: Record<ReportRangeKey, string> = {
    last_7_days: 'Last 7 days',
    last_30_days: 'Last 30 days',
    this_month: 'This month',
    last_month: 'Last month',
  };
  static readonly KEYS = Object.keys(ReportRange.LABELS) as ReportRangeKey[];

  static of(key: ReportRangeKey, now: Date): { from: string; to: string } {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = ReportRange.addDays(today, 1);
    if (key === 'last_7_days' || key === 'last_30_days') {
      const days = key === 'last_7_days' ? 7 : 30;
      return ReportRange.iso(ReportRange.addDays(tomorrow, -days), tomorrow);
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (key === 'this_month') {
      return ReportRange.iso(monthStart, tomorrow);
    }
    return ReportRange.iso(new Date(now.getFullYear(), now.getMonth() - 1, 1), monthStart);
  }

  /** "usage-2026-03-01-to-2026-04-01.csv", named by local dates. */
  static fileName(kind: string, range: { from: string; to: string }): string {
    return `${kind}-${ReportRange.day(range.from)}-to-${ReportRange.day(range.to)}.csv`;
  }

  private static day(iso: string): string {
    const date = new Date(iso);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private static addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private static iso(from: Date, to: Date): { from: string; to: string } {
    return { from: from.toISOString(), to: to.toISOString() };
  }
}
