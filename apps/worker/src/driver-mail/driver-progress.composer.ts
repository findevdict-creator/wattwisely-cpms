import { MailContent } from '@wattwisely/mail';
import { DriverEventRules } from './driver-event.rules';
import { MailText } from './mail-text';
import { WatchedSession } from './watched-session';

/**
 * The e-mails during a charge (NTF-01, NTF-02). They hold no link back to the charging
 * page: the page's key is a secret the platform does not keep.
 */
export class DriverProgressComposer {
  static readonly FOOTNOTE =
    'You asked for these updates when you started charging, on the charging page or in the app. You can turn each one off there.';

  static started(session: WatchedSession): MailContent {
    return {
      subject: `Charging started at ${session.siteName}`,
      headline: 'Your car is charging',
      paragraphs: [
        `Charging started at ${MailText.time(session.startedAt, session.timeZone)} on ${DriverProgressComposer.place(session)}.`,
        'We will let you know when it is nearly full and when it has finished.',
      ],
      footnote: DriverProgressComposer.FOOTNOTE,
    };
  }

  static nearlyFull(session: WatchedSession): MailContent {
    return {
      subject: `Your battery is at ${session.socPercent}%`,
      headline: `Your battery is at ${session.socPercent}%`,
      paragraphs: [
        `Your car on ${DriverProgressComposer.place(session)} is nearly full. ${MailText.kwh(session.energyWh)} so far.`,
      ],
      footnote: DriverProgressComposer.FOOTNOTE,
    };
  }

  static finished(session: WatchedSession): MailContent {
    const feeFrom = DriverEventRules.idleFeeFrom(session);
    const idle = feeFrom
      ? `Please move your car. From ${MailText.time(feeFrom, session.timeZone)} an idle fee of ${MailText.idleFee(session, feeFrom)} applies until you unplug.`
      : 'You can unplug and go whenever you are ready.';
    return {
      subject: `Charging finished at ${session.siteName}`,
      headline: 'Charging has finished',
      paragraphs: [
        `Your car on ${DriverProgressComposer.place(session)} has stopped charging after ${MailText.kwh(session.energyWh)}.`,
        idle,
      ],
      footnote: DriverProgressComposer.FOOTNOTE,
    };
  }

  static idleFeeSoon(session: WatchedSession): MailContent {
    const feeFrom = DriverEventRules.idleFeeFrom(session) ?? new Date();
    return {
      subject: 'The idle fee starts in 5 minutes',
      headline: 'Please move your car',
      paragraphs: [
        `From ${MailText.time(feeFrom, session.timeZone)} parking on ${DriverProgressComposer.place(session)} costs ${MailText.idleFee(session, feeFrom)}.`,
        'Unplug before then and you pay nothing extra.',
      ],
      footnote: DriverProgressComposer.FOOTNOTE,
    };
  }

  /** "charger CP-1 connector A at Riverside". */
  static place(session: WatchedSession): string {
    return `charger ${session.chargerIdentity} connector ${session.connectorLabel} at ${session.siteName}`;
  }
}
