import { SessionRow } from '../store/session-row';

/**
 * When a stopped session is ready for its final price (Sessions and Pricing design,
 * SessionFinaliseJob): as soon as the car is unplugged, or four hours after the stop if
 * the car is still there (the idle fee counts up to that cut-off). If the charger never
 * sent StopTransaction, four hours after the unplug the last reading is used instead.
 */
export class FinalisePolicy {
  static readonly AFTER_STOP_MS = 4 * 60 * 60 * 1000;

  static isDue(session: SessionRow, now: Date): boolean {
    if (session.status !== 'stopping') {
      return false;
    }
    const { endedAt, unpluggedAt } = session;
    if (endedAt && unpluggedAt) {
      return true;
    }
    const waitingSince = endedAt ?? unpluggedAt;
    return (
      waitingSince !== null &&
      now.getTime() - waitingSince.getTime() >= FinalisePolicy.AFTER_STOP_MS
    );
  }

  /** The end of the idle time after the stop: the unplug, else the cut-off, else now. */
  static idleUntil(session: SessionRow, now: Date): Date {
    if (session.unpluggedAt) {
      return session.unpluggedAt;
    }
    if (!session.endedAt) {
      return now;
    }
    const cutOff = session.endedAt.getTime() + FinalisePolicy.AFTER_STOP_MS;
    return new Date(Math.min(now.getTime(), cutOff));
  }
}
