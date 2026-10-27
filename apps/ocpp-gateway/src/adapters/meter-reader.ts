import { SampledValue } from '@wattwisely/db';
import { MeterReading } from '../storage/meter-values.repository';

/** A reading at one moment: the sampled values in the shape the platform stores (1.6's). */
export interface MeterValue {
  timestamp: string;
  sampledValue: SampledValue[];
}

/**
 * Pulls the numbers the platform keeps out of sampled values (Sessions and Pricing
 * design, "Which reading counts"): cumulative energy in Wh (kWh converted; the total
 * over all phases, or the sum of phases when no total is sent), power in W, SoC. OCPP 1.6
 * sends this shape as is; the 2.0.1 reader turns its own into it first.
 */
export class MeterReader {
  static readonly ENERGY = 'Energy.Active.Import.Register';
  static readonly POWER = 'Power.Active.Import';
  static readonly SOC = 'SoC';

  static read(meterValues: MeterValue[]): MeterReading[] {
    return meterValues.map((meterValue) => ({
      measuredAt: new Date(meterValue.timestamp),
      energyWh: MeterReader.total(meterValue.sampledValue, MeterReader.ENERGY, 1000),
      powerW: MeterReader.total(meterValue.sampledValue, MeterReader.POWER, 1000),
      socPercent: MeterReader.total(meterValue.sampledValue, MeterReader.SOC, 1),
      samples: meterValue.sampledValue,
    }));
  }

  /** The latest cumulative energy in a list of readings, or null when none carried it. */
  static latestEnergyWh(readings: MeterReading[]): number | null {
    return MeterReader.latestEnergy(readings)?.meterWh ?? null;
  }

  /** The newest energy register reading and when it was taken. */
  static latestEnergy(readings: MeterReading[]): { meterWh: number; at: Date } | null {
    const withEnergy = MeterReader.energyInOrder(readings);
    const latest = withEnergy[withEnergy.length - 1];
    return latest ? { meterWh: latest.energyWh as number, at: latest.measuredAt } : null;
  }

  /** The oldest energy register reading: what a transaction started at, when its first event says so. */
  static earliestEnergy(readings: MeterReading[]): { meterWh: number; at: Date } | null {
    const earliest = MeterReader.energyInOrder(readings)[0];
    return earliest ? { meterWh: earliest.energyWh as number, at: earliest.measuredAt } : null;
  }

  private static energyInOrder(readings: MeterReading[]): MeterReading[] {
    return readings
      .filter((reading) => reading.energyWh !== null)
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  }

  /** The measurand's value in base units: the no-phase sample, or the sum over phases. */
  private static total(
    samples: SampledValue[],
    measurand: string,
    kiloFactor: number,
  ): number | null {
    const matching = samples.filter(
      (sample) => (sample.measurand ?? MeterReader.ENERGY) === measurand,
    );
    const totals = matching.filter((sample) => !sample.phase);
    const chosen = totals.length > 0 ? totals.slice(0, 1) : matching;
    if (chosen.length === 0) {
      return null;
    }
    const sum = chosen.reduce((acc, sample) => acc + MeterReader.inBaseUnit(sample, kiloFactor), 0);
    return Number.isFinite(sum) ? Math.round(sum) : null;
  }

  private static inBaseUnit(sample: SampledValue, kiloFactor: number): number {
    const value = Number(sample.value);
    return sample.unit?.startsWith('k') ? value * kiloFactor : value;
  }
}
