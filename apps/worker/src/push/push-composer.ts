import { PushMessage } from '@wattwisely/push';
import { MoneyText } from '@wattwisely/reports';
import { DriverEventRules } from '../driver-mail/driver-event.rules';
import { MailText } from '../driver-mail/mail-text';
import { WatchedSession } from '../driver-mail/watched-session';
import { OutboxKind } from '../notifications/outbox-entry';

/**
 * What each push says (module 34), short enough for a lock screen, and the app's page a tap
 * opens: the live charge while it runs, its receipt at the end.
 */
export class PushComposer {
  static message(kind: OutboxKind, session: WatchedSession): PushMessage {
    const place = `${session.siteName}, connector ${session.connectorLabel}`;
    const live = { url: `/charges/${session.sessionId}`, session_id: session.sessionId };
    switch (kind) {
      case 'session_started':
        return {
          title: `Charging at ${session.siteName}`,
          body: `Your car is charging on ${place}.`,
          data: live,
        };
      case 'session_nearly_full':
        return {
          title: `Nearly full: ${session.socPercent ?? DriverEventRules.NEARLY_FULL_PERCENT}%`,
          body: `${MailText.kwh(session.energyWh)} so far on ${place}.`,
          data: live,
        };
      case 'session_idle_fee_soon':
        return PushComposer.idleFeeSoon(session, place, live);
      default:
        return PushComposer.receipt(session);
    }
  }

  private static idleFeeSoon(
    session: WatchedSession,
    place: string,
    data: Record<string, string>,
  ): PushMessage {
    const feeFrom = DriverEventRules.idleFeeFrom(session) ?? new Date();
    return {
      title: 'Unplug within 5 minutes',
      body: `From ${MailText.time(feeFrom, session.timeZone)} parking on ${place} costs ${MailText.idleFee(session, feeFrom)}.`,
      data,
    };
  }

  private static receipt(session: WatchedSession): PushMessage {
    const cost =
      session.currency && session.grossAmount
        ? MoneyText.withCode(session.capturedAmount ?? session.grossAmount, session.currency)
        : 'Free';
    return {
      title: `Charge complete: ${cost}`,
      body: `${MailText.kwh(session.energyWh)} at ${session.siteName}. Tap for the receipt.`,
      data: { url: `/sessions/${session.sessionId}`, session_id: session.sessionId },
    };
  }
}
