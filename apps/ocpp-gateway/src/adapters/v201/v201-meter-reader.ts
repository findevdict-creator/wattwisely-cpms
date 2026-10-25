import { SampledValue } from '@wattwisely/db';
import { MeterReading } from '../../storage/meter-values.repository';
import { MeterReader, MeterValue } from '../meter-reader';
import { MeterValue201, SampledValue201 } from './v201-messages';

/**
 * OCPP 2.0.1 sampled values are numbers with a unit and a power-of-ten multiplier, and
 * leave out the measurand and unit when they are the energy register in Wh. This turns
 * them into the shape the platform stores and reads (1.6's: strings, named units), then
 * the shared reader picks the numbers.
 */
export class V201MeterReader {
  static read(meterValues: MeterValue201[]): MeterReading[] {
    return MeterReader.read(meterValues.map((meterValue) => V201MeterReader.toStored(meterValue)));
  }

  static toStored(meterValue: MeterValue201): MeterValue {
    return {
      timestamp: meterValue.timestamp,
      sampledValue: meterValue.sampledValue.map((sample) => V201MeterReader.toSample(sample)),
    };
  }

  /** The multiplier is applied here, so a stored sample reads in its named unit. */
  private static toSample(sample: SampledValue201): SampledValue {
    const multiplier = sample.unitOfMeasure?.multiplier ?? 0;
    const value = sample.value * 10 ** multiplier;
    return {
      value: String(value),
      measurand: sample.measurand ?? MeterReader.ENERGY,
      unit: sample.unitOfMeasure?.unit ?? V201MeterReader.defaultUnit(sample.measurand),
      ...(sample.phase ? { phase: sample.phase } : {}),
      ...(sample.context ? { context: sample.context } : {}),
      ...(sample.location ? { location: sample.location } : {}),
    };
  }

  /** The unit the spec assumes when none is sent: Wh for energy, W for power, percent for SoC. */
  private static defaultUnit(measurand: string | undefined): string {
    switch (measurand ?? MeterReader.ENERGY) {
      case MeterReader.POWER:
        return 'W';
      case MeterReader.SOC:
        return 'Percent';
      default:
        return 'Wh';
    }
  }
}
