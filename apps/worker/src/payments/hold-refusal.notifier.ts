import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { chargers, driverAccounts, drivers, sites, Transaction } from '@wattwisely/db';
import { MailContent } from '@wattwisely/mail';
import { MoneyText } from '@wattwisely/reports';
import { SessionRow } from '@wattwisely/session-engine';
import { OutboxWriter } from '../notifications/outbox.writer';

/**
 * Tells a driver that the hold on their saved card was refused and their charge stopped
 * (module 19): one e-mail to the login behind the driver record, through the outbox, so it
 * goes out in the operator's brand with the operator's support address to reply to.
 */
@Injectable()
export class HoldRefusalNotifier {
  constructor(private readonly outbox: OutboxWriter) {}

  /** True when an e-mail was queued; false when the record has no login to write to. */
  async notify(tx: Transaction, session: SessionRow, refusal: string): Promise<boolean> {
    if (!session.driverId) {
      return false;
    }
    const rows = await tx
      .select({
        email: driverAccounts.email,
        siteName: sites.name,
        chargerIdentity: chargers.ocppIdentity,
      })
      .from(drivers)
      .innerJoin(driverAccounts, eq(driverAccounts.id, drivers.driverAccountId))
      .innerJoin(sites, eq(sites.id, session.siteId))
      .innerJoin(chargers, eq(chargers.id, session.chargerId))
      .where(eq(drivers.id, session.driverId));
    const place = rows[0];
    if (!place) {
      return false;
    }
    return this.outbox.enqueue(tx, {
      tenantId: session.tenantId,
      kind: 'session_hold_refused',
      dedupeKey: `session:${session.id}:session_hold_refused`,
      toAddress: place.email,
      sessionId: session.id,
      content: HoldRefusalNotifier.content(session, place, refusal),
    });
  }

  private static content(
    session: SessionRow,
    place: { siteName: string; chargerIdentity: string },
    refusal: string,
  ): MailContent {
    return {
      subject: `Your charge at ${place.siteName} was stopped`,
      headline: 'Your card could not be charged',
      paragraphs: [
        `The hold for your charge at ${place.siteName} (charger ${place.chargerIdentity}) was refused: ${refusal}`,
        `The charger was asked to stop and nothing was taken. ${HoldRefusalNotifier.usedSoFar(session)}`,
        'Check the card saved in your account, or add another one, before you charge again.',
      ],
      footnote:
        'You get this e-mail because your login is linked to a driver record at this operator.',
    };
  }

  private static usedSoFar(session: SessionRow): string {
    if (session.grossAmount === null || !session.currency) {
      return '';
    }
    return `The energy delivered so far comes to ${MoneyText.withCode(session.grossAmount, session.currency)}; the operator will settle it with you.`;
  }
}
