import { Revenue, UsageRow } from '../../core/api/models/report';
import { Money } from '../../shared/money';

/** The usage report's numbers as people read them. */
export class UsageFigures {
  /** 12345 Wh as "12.3 kWh". */
  static energy(wattHours: number): string {
    return `${(wattHours / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
  }

  /** 5400 s as "1.5 h". */
  static hours(seconds: number): string {
    return `${(seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
  }

  /** The rows most in use first, at most six, for the bars over the table. */
  static busiest(rows: UsageRow[], count = 6): UsageRow[] {
    return [...rows].sort((a, b) => b.utilisation_percent - a.utilisation_percent).slice(0, count);
  }

  /** The rows least online first, at most six. */
  static leastOnline(rows: UsageRow[], count = 6): UsageRow[] {
    return [...rows].sort((a, b) => a.uptime_percent - b.uptime_percent).slice(0, count);
  }

  /** No tone at 99% or more, warn from 97%, danger below. */
  static uptimeTone(percent: number): '' | 'warn' | 'danger' {
    if (percent >= 99) {
      return '';
    }
    return percent >= 97 ? 'warn' : 'danger';
  }

  /** "£8.80 + €2.00"; a dash for none. */
  static revenue(revenue: Revenue[]): string {
    return revenue.length === 0
      ? '—'
      : revenue.map((part) => Money.format(part.amount, part.currency)).join(' + ');
  }
}
