import { MeterPoint } from '../model/pricing-usage';

/** A raw meter reading as the charger sent it: the register value in Wh at that moment. */
export interface RawReading {
  at: Date;
  meterWh: number;
}

/** What the cleaner knows about the connector and the charger's clock. */
export interface CleaningOptions {
  /** The connector's rating; a jump no charger this size could deliver is dropped. */
  maxPowerKw?: number | null;
  /** Measured drift of the charger's clock; every timestamp is shifted by it. */
  clockOffsetMs?: number;
}

/** The cleaned series (energy delivered since the start, cumulative) and what was found. */
export interface CleanedSeries {
  series: MeterPoint[];
  flags: string[];
}

/**
 * Turns messy charger readings into a clean cumulative series (Sessions and Pricing
 * design, "Cleaning rules"): sorted by the charger's clock, duplicates dropped, a meter
 * that went backwards treated as a new baseline, and jumps the connector could not
 * physically deliver dropped and flagged.
 */
export class MeterSeriesCleaner {
  static readonly FLAG_RESET = 'meter_reset';
  static readonly FLAG_JUMP = 'implausible_jump';
  /** A jump may exceed the rating by this factor before it counts as impossible. */
  static readonly TOLERANCE = 1.2;
  static readonly TOLERANCE_WH = 100;

  clean(readings: RawReading[], options: CleaningOptions = {}): CleanedSeries {
    const flags = new Set<string>();
    const sorted = MeterSeriesCleaner.sortAndDedupe(readings, options.clockOffsetMs ?? 0);
    if (sorted.length === 0) {
      return { series: [], flags: [] };
    }
    const series: MeterPoint[] = [{ at: sorted[0].at, wh: 0 }];
    let last = sorted[0];
    let delivered = 0;
    for (const reading of sorted.slice(1)) {
      if (reading.meterWh < last.meterWh) {
        flags.add(MeterSeriesCleaner.FLAG_RESET);
      } else if (MeterSeriesCleaner.isImpossible(last, reading, options.maxPowerKw)) {
        flags.add(MeterSeriesCleaner.FLAG_JUMP);
        continue;
      } else {
        delivered += reading.meterWh - last.meterWh;
      }
      last = reading;
      series.push({ at: reading.at, wh: delivered });
    }
    return { series, flags: [...flags] };
  }

  private static sortAndDedupe(readings: RawReading[], clockOffsetMs: number): RawReading[] {
    const shifted = readings
      .filter((reading) => Number.isFinite(reading.meterWh))
      .map((reading) => ({
        at: new Date(reading.at.getTime() + clockOffsetMs),
        meterWh: reading.meterWh,
      }))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    return shifted.filter(
      (reading, index) => index === 0 || reading.at.getTime() !== shifted[index - 1].at.getTime(),
    );
  }

  private static isImpossible(
    last: RawReading,
    reading: RawReading,
    maxPowerKw: number | null | undefined,
  ): boolean {
    if (!maxPowerKw || maxPowerKw <= 0) {
      return false;
    }
    const hours = (reading.at.getTime() - last.at.getTime()) / 3_600_000;
    const allowedWh =
      maxPowerKw * 1000 * hours * MeterSeriesCleaner.TOLERANCE + MeterSeriesCleaner.TOLERANCE_WH;
    return reading.meterWh - last.meterWh > allowedWh;
  }
}
