import { BillingPeriod } from './billing-period';

/** The days of a month that a fee applies to. */
export interface DaySpan {
  /** How many of the month's days; 0 when the thing was not in force at all. */
  days: number;
  /** The first and last day of the month covered, 1-based; 0 when `days` is 0. */
  fromDay: number;
  toDay: number;
}

/**
 * Charges a monthly fee for the part of the month something was in force (module 15): a
 * plan from the day the tenant joined, a managed service until the day it ended. A day
 * counts in full when any part of it is covered, so the first and last days are both paid
 * and nobody is charged twice for the day a plan changed.
 */
export class Proration {
  /** The days of the period inside [from, to); an open end means "still in force". */
  static daysOf(period: BillingPeriod, from: Date | null, to: Date | null): DaySpan {
    const start = Math.max(from?.getTime() ?? 0, period.from.getTime());
    const end = Math.min(to?.getTime() ?? Infinity, period.to.getTime());
    if (end <= start) {
      return { days: 0, fromDay: 0, toDay: 0 };
    }
    const firstIndex = Math.floor((start - period.from.getTime()) / BillingPeriod.DAY_MS);
    const lastIndex = Math.ceil((end - period.from.getTime()) / BillingPeriod.DAY_MS) - 1;
    return { days: lastIndex - firstIndex + 1, fromDay: firstIndex + 1, toDay: lastIndex + 1 };
  }

  /** The whole month. */
  static full(period: BillingPeriod): DaySpan {
    return { days: period.days, fromDay: 1, toDay: period.days };
  }

  /** The two spans' overlap, e.g. an add-on's days within the plan's days. */
  static overlap(one: DaySpan, other: DaySpan): DaySpan {
    const fromDay = Math.max(one.fromDay, other.fromDay);
    const toDay = Math.min(one.toDay, other.toDay);
    if (one.days === 0 || other.days === 0 || toDay < fromDay) {
      return { days: 0, fromDay: 0, toDay: 0 };
    }
    return { days: toDay - fromDay + 1, fromDay, toDay };
  }

  /** The monthly amount for the days covered, rounded to the nearest minor unit. */
  static amount(monthlyAmount: number, span: DaySpan, period: BillingPeriod): number {
    if (span.days >= period.days) {
      return monthlyAmount;
    }
    return Math.round((monthlyAmount * span.days) / period.days);
  }

  /** ", 12–30 September (19 of 30 days)" for a part of the month; nothing for the whole month. */
  static suffix(span: DaySpan, period: BillingPeriod): string {
    if (span.days >= period.days) {
      return '';
    }
    const dates = span.fromDay === span.toDay ? `${span.fromDay}` : `${span.fromDay}–${span.toDay}`;
    return `, ${dates} ${period.monthName} (${span.days} of ${period.days} days)`;
  }
}
