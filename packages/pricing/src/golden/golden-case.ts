import { MeterSeriesCleaner } from '../meter/meter-series-cleaner';
import { PricingResult } from '../model/pricing-result';
import { PricingTariff } from '../model/pricing-tariff';
import { MeterPoint, Period, PricingUsage } from '../model/pricing-usage';

interface RawPeriod {
  from: string;
  to: string;
}

/** A golden case as stored on disk: dates are ISO strings, raw readings are optional. */
export interface GoldenFile {
  name: string;
  tariff: PricingTariff;
  readings?: { at: string; meterWh: number }[];
  usage: {
    startedAt: string;
    endedAt: string;
    series: { at: string; wh: number }[];
    chargingPeriods: RawPeriod[];
    idlePeriods: RawPeriod[];
    flags: string[];
  };
  expected: Partial<PricingResult> & { lines: Record<string, unknown>[] };
}

/**
 * Reads a golden case into engine input. When the case has raw charger readings they go
 * through the meter cleaner first, the same way the session engine prepares a real session.
 */
export class GoldenCase {
  constructor(readonly file: GoldenFile) {}

  usage(): PricingUsage {
    const raw = this.file.usage;
    const usage: PricingUsage = {
      startedAt: new Date(raw.startedAt),
      endedAt: new Date(raw.endedAt),
      series: raw.series.map((point): MeterPoint => ({ at: new Date(point.at), wh: point.wh })),
      chargingPeriods: raw.chargingPeriods.map((period) => GoldenCase.period(period)),
      idlePeriods: raw.idlePeriods.map((period) => GoldenCase.period(period)),
      flags: [...raw.flags],
    };
    if (this.file.readings) {
      const readings = this.file.readings.map((reading) => ({
        at: new Date(reading.at),
        meterWh: reading.meterWh,
      }));
      const cleaned = new MeterSeriesCleaner().clean(readings);
      usage.series = cleaned.series;
      usage.flags = cleaned.flags;
    }
    return usage;
  }

  /** The result's lines without times, in the shape the case file states them. */
  static linesOf(result: PricingResult): Record<string, unknown>[] {
    return result.lines.map(({ from: _from, to: _to, ...line }) => line);
  }

  private static period(raw: RawPeriod): Period {
    return { from: new Date(raw.from), to: new Date(raw.to) };
  }
}
