import { Revenue } from '../../core/api/models/report';
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

  /** "£8.80 + €2.00"; a dash for none. */
  static revenue(revenue: Revenue[]): string {
    return revenue.length === 0
      ? '—'
      : revenue.map((part) => Money.format(part.amount, part.currency)).join(' + ');
  }
}
