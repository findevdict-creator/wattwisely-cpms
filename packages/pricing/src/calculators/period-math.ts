import { Period } from '../model/pricing-usage';

/** Overlaps and lengths of time spans, in seconds. */
export class PeriodMath {
  static seconds(period: Period): number {
    return Math.max(0, period.to.getTime() - period.from.getTime()) / 1000;
  }

  /** Seconds of `periods` that fall inside `span`. */
  static overlapSeconds(periods: Period[], span: Period): number {
    return periods.reduce(
      (sum, period) => sum + PeriodMath.seconds(PeriodMath.overlap(period, span)),
      0,
    );
  }

  static overlap(a: Period, b: Period): Period {
    const from = new Date(Math.max(a.from.getTime(), b.from.getTime()));
    const to = new Date(Math.min(a.to.getTime(), b.to.getTime()));
    return { from, to: to.getTime() > from.getTime() ? to : from };
  }

  /** Sorted by start, overlapping or touching spans joined. */
  static normalise(periods: Period[]): Period[] {
    const sorted = periods
      .filter((period) => period.to.getTime() > period.from.getTime())
      .sort((a, b) => a.from.getTime() - b.from.getTime());
    const joined: Period[] = [];
    for (const period of sorted) {
      const last = joined[joined.length - 1];
      if (last && period.from.getTime() <= last.to.getTime()) {
        last.to = new Date(Math.max(last.to.getTime(), period.to.getTime()));
      } else {
        joined.push({ from: period.from, to: period.to });
      }
    }
    return joined;
  }
}
