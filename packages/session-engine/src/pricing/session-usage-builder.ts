import { MeterSeriesCleaner, PricingUsage, RawReading } from '@wattwisely/pricing';
import { StateChange } from '../store/session-history-store';
import { SessionRow } from '../store/session-row';
import { SessionTimeline } from './session-timeline';

/** Everything stored about a session that its price depends on. */
export interface SessionFacts {
  session: SessionRow;
  readings: RawReading[];
  history: StateChange[];
  maxPowerKw: number | null;
}

/** How far to read: the cost so far of a running session, or the final price. */
export interface UsageWindow {
  now: Date;
  isFinal: boolean;
  /** When the car stopped being idle after the transaction ended. */
  idleUntil: Date | null;
}

/**
 * Builds the pricing engine's usage input from what the gateway stored: the start and
 * stop readings around the MeterValues, cleaned, and the charging and idle periods
 * from the state history. Returns null when a final price has no valid stop data:
 * the charger never said how the session ended and sent no reading to fall back on.
 */
export class SessionUsageBuilder {
  private readonly cleaner = new MeterSeriesCleaner();

  build(facts: SessionFacts, window: UsageWindow): PricingUsage | null {
    const { session } = facts;
    const endedAt = SessionUsageBuilder.endOf(facts, window);
    if (!endedAt) {
      return null;
    }
    const cleaned = this.cleaner.clean(SessionUsageBuilder.readingsOf(facts), {
      maxPowerKw: facts.maxPowerKw,
    });
    const periods = SessionTimeline.periods(facts.history, {
      startedAt: session.startedAt,
      endedAt,
      idleUntil: session.endedAt ? window.idleUntil : null,
    });
    return {
      startedAt: session.startedAt,
      endedAt,
      series: cleaned.series,
      ...periods,
      flags: cleaned.flags,
    };
  }

  /** The stop time; without a StopTransaction, the last reading for a final price. */
  private static endOf(facts: SessionFacts, window: UsageWindow): Date | null {
    if (facts.session.endedAt) {
      return facts.session.endedAt;
    }
    if (!window.isFinal) {
      return window.now;
    }
    return facts.readings[facts.readings.length - 1]?.at ?? null;
  }

  private static readingsOf(facts: SessionFacts): RawReading[] {
    const { session } = facts;
    const readings: RawReading[] = [
      { at: session.startedAt, meterWh: session.meterStartWh },
      ...facts.readings,
    ];
    if (session.endedAt && session.meterStopWh !== null) {
      readings.push({ at: session.endedAt, meterWh: session.meterStopWh });
    }
    return readings;
  }
}
