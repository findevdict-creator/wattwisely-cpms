import { Injectable } from '@nestjs/common';
import { staffNotifications, Transaction, UuidV7 } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';
import { OutboxWriter } from '../notifications/outbox.writer';
import { AlertFinding } from './alert-finding';
import { AlertRecipient, AlertRecipientsRepository } from './alert-recipients.repository';
import { QuietHours } from './quiet-hours';

/** An alert that just opened. */
export interface OpenedAlert {
  id: string;
  tenantId: string;
  finding: AlertFinding;
}

/**
 * Tells the right people about an alert that just opened (NTF-03): a line in their portal
 * inbox and an e-mail, each as their routing says. Quiet hours hold the e-mail until they
 * end, except for a faulted connector, which goes at once.
 */
@Injectable()
export class AlertDelivery {
  constructor(
    private readonly config: WorkerConfig,
    private readonly recipients: AlertRecipientsRepository,
    private readonly outbox: OutboxWriter,
  ) {}

  /** How many people were told. */
  async deliver(tx: Transaction, alert: OpenedAlert, now: Date): Promise<number> {
    const recipients = await this.recipients.find(tx, alert.finding.type, alert.finding.siteId);
    for (const recipient of recipients) {
      if (recipient.isInPortal) {
        await this.toInbox(tx, alert, recipient);
      }
      if (recipient.isEmail) {
        await this.toEmail(tx, alert, recipient, now);
      }
    }
    return recipients.length;
  }

  private async toInbox(tx: Transaction, alert: OpenedAlert, recipient: AlertRecipient) {
    await tx.insert(staffNotifications).values({
      id: UuidV7.create(),
      tenantId: alert.tenantId,
      membershipId: recipient.membershipId,
      kind: 'alert_opened',
      title: alert.finding.title,
      body: AlertDelivery.since(alert.finding),
      link: `/alerts/${alert.id}`,
      alertId: alert.id,
    });
  }

  private async toEmail(tx: Transaction, alert: OpenedAlert, recipient: AlertRecipient, now: Date) {
    const finding = alert.finding;
    const isUrgent = finding.type === 'connector_faulted';
    await this.outbox.enqueue(tx, {
      tenantId: alert.tenantId,
      kind: 'alert_opened',
      dedupeKey: `alert:${alert.id}:${recipient.membershipId}`,
      toAddress: recipient.email,
      alertId: alert.id,
      membershipId: recipient.membershipId,
      sendAfter: isUrgent ? now : QuietHours.sendAt(recipient.quietHours, now),
      content: {
        subject: `Alert: ${finding.title}`,
        headline: finding.title,
        paragraphs: [AlertDelivery.since(finding)],
        action: { label: 'Open the alert', url: `${this.portalUrl()}/alerts/${alert.id}` },
        footnote:
          'You get this because of your alert routing. Your quiet hours are in your profile menu.',
      },
    });
  }

  private portalUrl(): string {
    return this.config.portalUrl.replace(/\/+$/, '');
  }

  private static since(finding: AlertFinding): string {
    return `Since ${finding.beganAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.`;
  }
}
