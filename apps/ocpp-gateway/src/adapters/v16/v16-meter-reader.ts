import { SampledValue } from '@wattwisely/db';
import { MeterReading } from '../../storage/meter-values.repository';
import { MeterValue } from './v16-messages';

/**
 * Pulls the numbers the platform keeps out of OCPP 1.6 sampled values (Sessions and
 * Pricing design, "Which reading counts"): cumulative energy in Wh (kWh converted; the
 * total over all phases, or the sum of phases when no total is sent), power in W, SoC.
 */
export class V16MeterReader {
  static readonly ENERGY = 'Energy.Active.Import.Register';
  static readonly POWER = 'Power.Active.Import';
  static readonly SOC = 'SoC';

  static read(meterValues: MeterValue[]): MeterReading[] {
    return meterValues.map((meterValue) => ({
      measuredAt: new Date(meterValue.timestamp),
      energyWh: V16MeterReader.total(meterValue.sampledValue, V16MeterReader.ENERGY, 1000),
      powerW: V16MeterReader.total(meterValue.sampledValue, V16MeterReader.POWER, 1000),
      socPercent: V16MeterReader.total(meterValue.sampledValue, V16MeterReader.SOC, 1),
      samples: meterValue.sampledValue,
    }));
  }

  /** The latest cumulative energy in a list of readings, or null when none carried it. */
  static latestEnergyWh(readings: MeterReading[]): number | null {
    return V16MeterReader.latestEnergy(readings)?.meterWh ?? null;
  }

  /** The newest energy register reading and when it was taken. */
  static latestEnergy(readings: MeterReading[]): { meterWh: number; at: Date } | null {
    const withEnergy = readings
      .filter((reading) => reading.energyWh !== null)
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
    const latest = withEnergy[withEnergy.length - 1];
    return latest ? { meterWh: latest.energyWh as number, at: latest.measuredAt } : null;
  }

  /** The measurand's value in base units: the no-phase sample, or the sum over phases. */
  private static total(
    samples: SampledValue[],
    measurand: string,
    kiloFactor: number,
  ): number | null {
    const matching = samples.filter(
      (sample) => (sample.measurand ?? V16MeterReader.ENERGY) === measurand,
    );
    const totals = matching.filter((sample) => !sample.phase);
    const chosen = totals.length > 0 ? totals.slice(0, 1) : matching;
    if (chosen.length === 0) {
      return null;
    }
    const sum = chosen.reduce(
      (acc, sample) => acc + V16MeterReader.inBaseUnit(sample, kiloFactor),
      0,
    );
    return Number.isFinite(sum) ? Math.round(sum) : null;
  }

  private static inBaseUnit(sample: SampledValue, kiloFactor: number): number {
    const value = Number(sample.value);
    return sample.unit?.startsWith('k') ? value * kiloFactor : value;
  }
}
