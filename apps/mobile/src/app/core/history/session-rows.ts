import { ChargeHistory, ChargeMonth, DriverCharge } from '@wattwisely/driver-core';
import { MonthTotal, MonthTotals } from './month-totals';
import { SessionWords } from './session-words';

/** One line of "My sessions": where and when, what was charged, and what it cost. */
export interface SessionRow {
  id: string;
  title: string;
  line: string;
  amount: string;
  link: string[];
  isRefused: boolean;
}

/** A month heading and its lines. */
export interface SessionMonth {
  label: string;
  rows: SessionRow[];
}

/** The Sessions tab laid out: the months with their lines, and the latest two months' totals. */
export class SessionRows {
  static readonly TOTALS_SHOWN = 2;

  static months(months: ChargeMonth[], now = Date.now()): SessionMonth[] {
    return months.map((month) => ({
      label: month.label,
      rows: month.charges.map((charge) => SessionRows.row(charge, now)),
    }));
  }

  static totals(months: ChargeMonth[]): MonthTotal[] {
    return months.slice(0, SessionRows.TOTALS_SHOWN).map((month) => MonthTotals.of(month));
  }

  private static row(charge: DriverCharge, now: number): SessionRow {
    return {
      id: charge.id,
      title: SessionWords.title(charge),
      line: SessionWords.line(charge, now),
      amount: SessionWords.amount(charge),
      link: SessionWords.link(charge),
      isRefused: ChargeHistory.isRefused(charge),
    };
  }
}
