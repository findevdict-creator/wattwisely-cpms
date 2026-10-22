import { MeterInterpolator } from '../meter/meter-interpolator';
import { Segment } from '../segments/local-time-segmenter';
import { LineAmounts } from './line-amounts';
import { PricedLine } from './priced-line';

/**
 * Energy per band (Sessions and Pricing design, step 2): the meter reading is read at
 * each band boundary, straight between samples, so each line gets a whole number of Wh
 * and the lines add up to the energy delivered.
 */
export class EnergyCalculator {
  constructor(private readonly amounts: LineAmounts) {}

  lines(segments: Segment[], meter: MeterInterpolator): PricedLine[] {
    const lines: PricedLine[] = [];
    if (segments.length === 0) {
      return lines;
    }
    let delivered = Math.round(meter.at(segments[0].from));
    for (const segment of segments) {
      const deliveredAtEnd = Math.round(meter.at(segment.to));
      const wh = deliveredAtEnd - delivered;
      delivered = deliveredAtEnd;
      if (wh <= 0) {
        continue;
      }
      lines.push({
        kind: 'energy',
        bandName: segment.band.name,
        from: segment.from,
        to: segment.to,
        quantity: wh,
        unit: 'wh',
        unitPrice: segment.band.energyPricePerKwh,
        amount: this.amounts.energy(wh, segment.band.energyPricePerKwh),
      });
    }
    return lines;
  }
}
