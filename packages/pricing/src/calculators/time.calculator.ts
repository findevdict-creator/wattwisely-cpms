import { Period } from '../model/pricing-usage';
import { Segment } from '../segments/local-time-segmenter';
import { LineAmounts } from './line-amounts';
import { PeriodMath } from './period-math';
import { PricedLine, PricedLines } from './priced-line';

/** Time at the band's hourly price, counted only while energy flowed (design, step 3). */
export class TimeCalculator {
  constructor(private readonly amounts: LineAmounts) {}

  lines(segments: Segment[], chargingPeriods: Period[]): PricedLine[] {
    const periods = PeriodMath.normalise(chargingPeriods);
    const lines: PricedLine[] = [];
    for (const segment of segments) {
      const seconds = PeriodMath.overlapSeconds(periods, segment);
      if (seconds <= 0 || segment.band.timePricePerHour <= 0) {
        continue;
      }
      lines.push({
        kind: 'time',
        bandName: segment.band.name,
        from: segment.from,
        to: segment.to,
        quantity: PricedLines.minutes(seconds),
        unit: 'min',
        unitPrice: segment.band.timePricePerHour,
        amount: this.amounts.time(seconds, segment.band.timePricePerHour),
      });
    }
    return lines;
  }
}
