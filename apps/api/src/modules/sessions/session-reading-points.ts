import { SessionReadingDto } from './dto/session-reading.dto';
import { SessionReading } from './session-record';

/** The facts about a session that its chart starts and ends with. */
export interface SessionMeter {
  startedAt: Date;
  endedAt: Date | null;
  meterStartWh: number | null;
  meterStopWh: number | null;
}

/**
 * A session's chart (module 5): 0 Wh at the start, each reading's energy since the start, and
 * the stop reading once the session has one. Staff's session page and the driver's app (module
 * 32) draw the same points.
 */
export class SessionReadingPoints {
  static of(meter: SessionMeter, readings: SessionReading[]): SessionReadingDto[] {
    const meterStartWh = meter.meterStartWh ?? 0;
    const points: SessionReading[] = [
      { at: meter.startedAt, energyWh: 0, powerW: null, socPercent: null },
      ...readings.map((reading) => ({
        ...reading,
        energyWh: reading.energyWh === null ? null : reading.energyWh - meterStartWh,
      })),
    ];
    if (meter.endedAt && meter.meterStopWh !== null) {
      const energyWh = meter.meterStopWh - meterStartWh;
      points.push({ at: meter.endedAt, energyWh, powerW: null, socPercent: null });
    }
    return points.map((point) => new SessionReadingDto(point));
  }
}
