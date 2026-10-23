import { MailContent } from '@wattwisely/mail';
import { MoneyText } from '@wattwisely/reports';
import { DriverProgressComposer } from './driver-progress.composer';
import { MailText } from './mail-text';
import { WatchedSession } from './watched-session';
import { ReceiptLineRow } from './watched-sessions.repository';

/**
 * The receipt e-mail (stories SES-03 and NTF-01): the session has ended, what it cost line
 * by line, the tax, and what was taken from the card. A free session says so.
 */
export class ReceiptComposer {
  static readonly LINE_NAMES: Record<string, string> = {
    start_fee: 'Start fee',
    energy: 'Energy',
    time: 'Time',
    idle: 'Idle fee',
    adjustment: 'Adjustment',
  };

  static receipt(session: WatchedSession, lines: ReceiptLineRow[]): MailContent {
    const ended = session.endedAt ?? session.startedAt;
    return {
      subject: `Your receipt from ${session.siteName}`,
      headline: 'Thanks for charging',
      paragraphs: [
        `Your session on ${DriverProgressComposer.place(session)} ran from ${MailText.dateTime(session.startedAt, session.timeZone)} to ${MailText.time(ended, session.timeZone)} and delivered ${MailText.kwh(session.energyWh)}.`,
        ...ReceiptComposer.priceLines(session, lines),
      ],
      footnote: `Session reference: ${session.sessionId}`,
    };
  }

  private static priceLines(session: WatchedSession, lines: ReceiptLineRow[]): string[] {
    const currency = session.currency;
    if (!currency || !session.grossAmount) {
      return ['This session was free.'];
    }
    const money = (amount: number) => MoneyText.withCode(amount, currency);
    return [
      ...lines.map((line) => `${ReceiptComposer.lineName(line)}: ${money(line.gross)}`),
      `Total ${money(session.grossAmount)}, including tax of ${money(session.taxAmount ?? 0)}.`,
      ...ReceiptComposer.paymentLine(session, money),
    ];
  }

  private static paymentLine(session: WatchedSession, money: (amount: number) => string): string[] {
    if (!session.isPaid) {
      return [];
    }
    if (session.paymentStatus === 'released') {
      return ['Nothing was taken from your card.'];
    }
    return session.capturedAmount === null
      ? []
      : [`Taken from your card: ${money(session.capturedAmount)}.`];
  }

  private static lineName(line: ReceiptLineRow): string {
    const name = ReceiptComposer.LINE_NAMES[line.kind] ?? line.kind;
    const band = line.bandName ? ` (${line.bandName})` : '';
    const quantity =
      line.unit === 'wh'
        ? `, ${MailText.kwh(line.quantity)}`
        : line.unit === 'min'
          ? `, ${line.quantity} min`
          : '';
    return `${name}${band}${quantity}`;
  }
}
