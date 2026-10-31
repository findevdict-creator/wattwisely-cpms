import { KpiTrend } from '@wattwisely/ui';

/** The periods the home page compares. */
export type PeriodKey = 'today' | '7d' | '30d';

/** A stretch of time, as the usage report takes it. */
export interface Range {
  from: string;
  to: string;
}

/** How a figure changed: the line under a KPI card and its color. */
export interface Change {
  text: string;
  trend: KpiTrend;
}

/** The home page's periods: today so far, or the last 7 or 30 days, each with the one before. */
export class HomePeriod {
  static readonly DAY_MS = 86_400_000;
  static readonly OPTIONS: { key: PeriodKey; label: string; previous: string }[] = [
    { key: 'today', label: 'Today', previous: 'the same time yesterday' },
    { key: '7d', label: '7 days', previous: 'the previous 7 days' },
    { key: '30d', label: '30 days', previous: 'the previous 30 days' },
  ];

  /** The period up to now, and the one just before it of the same length. */
  static ranges(key: PeriodKey, now = new Date()): { current: Range; previous: Range } {
    const end = now.getTime();
    const start =
      key === 'today'
        ? HomePeriod.midnight(now, 0)
        : end - HomePeriod.days(key) * HomePeriod.DAY_MS;
    const shift = key === 'today' ? HomePeriod.DAY_MS : end - start;
    return {
      current: HomePeriod.range(start, end),
      previous: HomePeriod.range(start - shift, end - shift),
    };
  }

  /** The last 7 days, one range each from midnight, today's up to now. */
  static lastDays(count: number, now = new Date()): Range[] {
    return Array.from({ length: count }, (_, index) => {
      const start = HomePeriod.midnight(now, index - count + 1);
      const end = Math.min(start + HomePeriod.DAY_MS, now.getTime());
      return HomePeriod.range(start, end);
    });
  }

  /** "+12% on the previous 7 days"; nothing when there was nothing to compare with. */
  static change(current: number, previous: number, key: PeriodKey): Change {
    if (previous <= 0) {
      return { text: '', trend: 'none' };
    }
    const percent = Math.round(((current - previous) / previous) * 100);
    const against = HomePeriod.OPTIONS.find((option) => option.key === key)?.previous ?? '';
    if (percent === 0) {
      return { text: `Same as ${against}`, trend: 'none' };
    }
    return {
      text: `${percent > 0 ? '+' : ''}${percent}% on ${against}`,
      trend: percent > 0 ? 'up' : 'down',
    };
  }

  /** "Good morning" before noon, "Good afternoon" until six, then "Good evening". */
  static greeting(now = new Date()): string {
    const hour = now.getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    return hour < 18 ? 'Good afternoon' : 'Good evening';
  }

  private static days(key: PeriodKey): number {
    return key === '30d' ? 30 : 7;
  }

  /** Midnight, local time, `offset` days from `now`'s day. */
  private static midnight(now: Date, offset: number): number {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime();
  }

  private static range(start: number, end: number): Range {
    return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
  }
}
