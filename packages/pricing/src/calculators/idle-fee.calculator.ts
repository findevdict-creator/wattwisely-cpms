import { Period } from '../model/pricing-usage';
import { Segment } from '../segments/local-time-segmenter';
import { LineAmounts } from './line-amounts';
import { PeriodMath } from './period-math';
import { PricedLine, PricedLines } from './priced-line';

/**
 * The idle fee (design, step 4): billable idle minutes at each band's per-minute price,
 * trimmed to the tariff's cap when there is one.
 */
export class IdleFeeCalculator {
  constructor(private readonly amounts: LineAmounts) {}

  lines(segments: Segment[], billableIdle: Period[], cap: number | null): PricedLine[] {
    const lines: PricedLine[] = [];
    for (const segment of segments) {
      const seconds = PeriodMath.overlapSeconds(billableIdle, segment);
      if (seconds <= 0 || segment.band.idleFeePerMinute <= 0) {
        continue;
      }
      lines.push({
        kind: 'idle',
        bandName: segment.band.name,
        from: segment.from,
        to: segment.to,
        quantity: PricedLines.minutes(seconds),
        unit: 'min',
        unitPrice: segment.band.idleFeePerMinute,
        amount: this.amounts.idle(seconds, segment.band.idleFeePerMinute),
      });
    }
    return cap === null ? lines : IdleFeeCalculator.capped(lines, cap);
  }

  /** Lines up to the cap; the line that crosses it is cut down and the rest dropped. */
  private static capped(lines: PricedLine[], cap: number): PricedLine[] {
    const kept: PricedLine[] = [];
    let total = 0;
    for (const line of lines) {
      if (total >= cap) {
        break;
      }
      const amount = Math.min(line.amount, cap - total);
      kept.push({ ...line, amount });
      total += amount;
    }
    return kept;
  }
}
