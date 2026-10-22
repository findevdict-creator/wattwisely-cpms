import { MeterPoint } from '../model/pricing-usage';

/**
 * The cumulative energy at any instant: read straight off a point, or in a straight
 * line between the two points around it (Sessions and Pricing design, "Energy per band").
 * Before the first point there is nothing yet; after the last, nothing more.
 */
export class MeterInterpolator {
  constructor(private readonly series: MeterPoint[]) {}

  at(instant: Date): number {
    const time = instant.getTime();
    if (this.series.length === 0 || time <= this.series[0].at.getTime()) {
      return 0;
    }
    const last = this.series[this.series.length - 1];
    if (time >= last.at.getTime()) {
      return last.wh;
    }
    const after = this.series.findIndex((point) => point.at.getTime() > time);
    const before = this.series[after - 1];
    const next = this.series[after];
    const span = next.at.getTime() - before.at.getTime();
    return before.wh + ((next.wh - before.wh) * (time - before.at.getTime())) / span;
  }

  /** Energy delivered inside a span, in Wh (fractional between points). */
  between(from: Date, to: Date): number {
    return Math.max(0, this.at(to) - this.at(from));
  }

  /** The energy delivered in all, in whole Wh. */
  total(): number {
    return Math.round(this.series[this.series.length - 1]?.wh ?? 0);
  }
}
