import { DriverEventRules } from '../driver-mail/driver-event.rules';
import { OutboxKind } from '../notifications/outbox-entry';
import { WatchedSession } from '../driver-mail/watched-session';

/**
 * Which pushes a session is due now (module 34), by the e-mails' rules (NTF-01): started,
 * nearly full and the idle fee warning when the driver wants them, and the receipt when they
 * want "Finished, with the receipt". The e-mails' separate "charging finished" is not pushed:
 * on a phone the receipt follows within a minute or two.
 */
export class PushEventRules {
  static due(session: WatchedSession, now: Date): OutboxKind[] {
    return DriverEventRules.due({ ...session, wantsFinished: false }, now).filter(
      (kind) => kind !== 'session_receipt' || session.wantsFinished,
    );
  }
}
