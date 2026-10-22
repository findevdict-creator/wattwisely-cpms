import { MeterPoint, PricingUsage } from './model/pricing-usage';
import { LocalTimeSegmenter } from './segments/local-time-segmenter';
import { SegmentMerger } from './segments/segment-merger';
import { PricingSpan } from './pricing-span';

/** Why a person should look at a session before it is captured (design, "Edge cases"). */
export class ReviewFlags {
  static readonly LONG_SESSION = 'long_session';
  static readonly GAP_CROSSES_BAND = 'gap_crosses_band';
  static readonly NO_ENERGY = 'no_energy';
  static readonly LONG_SESSION_MS = 48 * 60 * 60 * 1000;
  static readonly GAP_MS = 15 * 60 * 1000;

  static of(usage: PricingUsage, segmenter: LocalTimeSegmenter, energyWh: number): string[] {
    const flags = new Set<string>(usage.flags);
    const span = PricingSpan.of(usage);
    if (span.to.getTime() - span.from.getTime() > ReviewFlags.LONG_SESSION_MS) {
      flags.add(ReviewFlags.LONG_SESSION);
    }
    if (ReviewFlags.hasGapAcrossBoundary(usage.series, segmenter)) {
      flags.add(ReviewFlags.GAP_CROSSES_BAND);
    }
    if (energyWh === 0) {
      flags.add(ReviewFlags.NO_ENERGY);
    }
    return [...flags].sort();
  }

  /** A gap of more than 15 minutes between samples with a change of band inside it. */
  private static hasGapAcrossBoundary(
    series: MeterPoint[],
    segmenter: LocalTimeSegmenter,
  ): boolean {
    return series.some((point, index) => {
      const previous = series[index - 1];
      if (!previous || point.at.getTime() - previous.at.getTime() <= ReviewFlags.GAP_MS) {
        return false;
      }
      return SegmentMerger.mergeAdjacent(segmenter.split(previous.at, point.at)).length > 1;
    });
  }
}
