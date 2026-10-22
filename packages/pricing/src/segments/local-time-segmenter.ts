import { PricingTariff } from '../model/pricing-tariff';
import { TariffBand } from '../model/tariff-band';
import { BandMatcher } from './band-matcher';
import { LocalClock } from './local-clock';

/** A stretch of time inside one band. `from` inclusive, `to` exclusive. */
export interface Segment {
  from: Date;
  to: Date;
  band: TariffBand;
}

/**
 * Cuts a span of time into segments at every band edge and midnight, read in the
 * site's time zone (Sessions and Pricing design, step 1). A daylight saving change is a
 * cut too, so the band is read afresh when the clocks jump; a boundary at 17:00 is
 * 17:00 on the wall either way.
 */
export class LocalTimeSegmenter {
  private readonly clock: LocalClock;
  private readonly matcher: BandMatcher;

  constructor(tariff: Pick<PricingTariff, 'timeZone' | 'bands'>) {
    this.clock = new LocalClock(tariff.timeZone);
    this.matcher = new BandMatcher(tariff.bands);
  }

  split(from: Date, to: Date): Segment[] {
    const segments: Segment[] = [];
    let cursor = from;
    while (cursor.getTime() < to.getTime()) {
      const parts = this.clock.partsOf(cursor);
      const band = this.matcher.match(parts.weekday, parts.secondOfDay);
      const boundary = this.nextBoundary(cursor);
      const end = boundary.getTime() < to.getTime() ? boundary : to;
      segments.push({ from: cursor, to: end, band });
      cursor = end;
    }
    return segments;
  }

  /** Every boundary instant strictly inside (from, to). */
  boundariesBetween(from: Date, to: Date): Date[] {
    return this.split(from, to)
      .slice(1)
      .map((segment) => segment.from);
  }

  /** The first band edge, midnight or clock change after this instant. */
  nextBoundary(instant: Date): Date {
    const edge = this.nextEdge(instant);
    return this.clock.transitionBetween(instant, edge) ?? edge;
  }

  private nextEdge(instant: Date): Date {
    const parts = this.clock.partsOf(instant);
    const instants = this.matcher
      .boundariesOn(parts.weekday)
      .filter((seconds) => seconds > parts.secondOfDay)
      .flatMap((seconds) => this.clock.instantsAt(parts, seconds))
      .filter((candidate) => candidate.getTime() > instant.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    return instants[0] ?? this.clock.nextMidnight(instant);
  }
}
