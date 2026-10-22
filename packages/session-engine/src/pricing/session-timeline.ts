import { Period } from '@wattwisely/pricing';
import { SessionState } from '../state/session-state';
import { StateChange } from '../store/session-history-store';

/** The bounds the timeline is read within. */
export interface TimelineBounds {
  startedAt: Date;
  /** When the transaction ended, or now for a running session. */
  endedAt: Date;
  /** After the transaction ends the car is idle until this moment (unplugged, or the cut-off). */
  idleUntil: Date | null;
}

/**
 * Reads a session's history as the two kinds of time the tariff prices: when energy
 * flowed (state charging) and when the car sat idle (state idle, then from the end of
 * the transaction until it was unplugged).
 */
export class SessionTimeline {
  static periods(history: StateChange[], bounds: TimelineBounds) {
    const spans = SessionTimeline.spans(history, bounds);
    const chargingPeriods = SessionTimeline.periodsIn(spans, 'charging');
    const idlePeriods = SessionTimeline.periodsIn(spans, 'idle');
    if (bounds.idleUntil && bounds.idleUntil.getTime() > bounds.endedAt.getTime()) {
      idlePeriods.push({ from: bounds.endedAt, to: bounds.idleUntil });
    }
    return { chargingPeriods, idlePeriods };
  }

  /** Each state the session was in, from when to when, cut to the transaction. */
  private static spans(history: StateChange[], bounds: TimelineBounds) {
    if (history.length === 0) {
      return [{ status: 'charging' as SessionState, from: bounds.startedAt, to: bounds.endedAt }];
    }
    return history.map((change, index) => {
      const next = history[index + 1]?.occurredAt ?? bounds.endedAt;
      const from = SessionTimeline.clamp(change.occurredAt, bounds);
      return { status: change.toStatus, from, to: SessionTimeline.clamp(next, bounds) };
    });
  }

  private static periodsIn(
    spans: { status: SessionState; from: Date; to: Date }[],
    status: SessionState,
  ): Period[] {
    return spans
      .filter((span) => span.status === status && span.to.getTime() > span.from.getTime())
      .map((span) => ({ from: span.from, to: span.to }));
  }

  private static clamp(instant: Date, bounds: TimelineBounds): Date {
    const time = Math.min(
      Math.max(instant.getTime(), bounds.startedAt.getTime()),
      bounds.endedAt.getTime(),
    );
    return new Date(time);
  }
}
