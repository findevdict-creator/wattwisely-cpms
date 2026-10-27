import { OutboxKind } from '../notifications/outbox-entry';
import { WatchedSession } from './watched-session';

/**
 * Which driver e-mails a session is due now (NTF-01, NTF-02): started while it charges,
 * nearly full at 80% if the car reports its charge, charging finished once energy stops,
 * the idle fee warning 5 minutes before the grace period ends while the car is still
 * plugged in, and the receipt once the session is priced and its payment settled.
 * Each goes once, and only the receipt cannot be turned off.
 */
export class DriverEventRules {
  static readonly NEARLY_FULL_PERCENT = 80;
  static readonly WARNING_MS = 5 * 60_000;
  static readonly CHARGING = new Set(['charging', 'suspended']);
  static readonly FINISHED = new Set(['idle', 'stopping']);
  static readonly SETTLED_PAYMENTS = new Set([
    'captured',
    'released',
    'partially_refunded',
    'refunded',
  ]);

  static due(session: WatchedSession, now: Date): OutboxKind[] {
    const kinds: [OutboxKind, boolean][] = [
      ['session_started', session.wantsStarted && DriverEventRules.CHARGING.has(session.status)],
      ['session_nearly_full', session.wantsNearlyFull && DriverEventRules.isNearlyFull(session)],
      [
        'session_charging_finished',
        session.wantsFinished && DriverEventRules.FINISHED.has(session.status),
      ],
      [
        'session_idle_fee_soon',
        session.wantsIdleWarning && DriverEventRules.isIdleFeeSoon(session, now),
      ],
      ['session_receipt', DriverEventRules.isReceiptDue(session)],
    ];
    return kinds
      .filter(([kind, isDue]) => isDue && !session.sentKinds.includes(kind))
      .map(([kind]) => kind);
  }

  /** When the idle fee starts: the grace period after energy stopped. Null without an idle fee. */
  static idleFeeFrom(session: WatchedSession): Date | null {
    const hasIdleFee = session.tariff?.bands.some((band) => band.idleFeePerMinute > 0) ?? false;
    if (!hasIdleFee || !session.finishedAt || !session.tariff) {
      return null;
    }
    return new Date(session.finishedAt.getTime() + session.tariff.idleGraceMinutes * 60_000);
  }

  private static isNearlyFull(session: WatchedSession): boolean {
    return (
      DriverEventRules.CHARGING.has(session.status) &&
      (session.socPercent ?? 0) >= DriverEventRules.NEARLY_FULL_PERCENT
    );
  }

  private static isIdleFeeSoon(session: WatchedSession, now: Date): boolean {
    const feeFrom = DriverEventRules.idleFeeFrom(session);
    if (!feeFrom || session.unpluggedAt || !DriverEventRules.FINISHED.has(session.status)) {
      return false;
    }
    const time = now.getTime();
    return time >= feeFrom.getTime() - DriverEventRules.WARNING_MS && time < feeFrom.getTime();
  }

  private static isReceiptDue(session: WatchedSession): boolean {
    if (session.status !== 'completed') {
      return false;
    }
    return !session.isPaid || DriverEventRules.SETTLED_PAYMENTS.has(session.paymentStatus ?? '');
  }
}
