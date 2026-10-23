import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { BrandedMailLayout, MailDeliveryError, MailMessage } from '@wattwisely/mail';
import { BrandReader } from '../mail/brand.reader';
import { WorkerMailSender } from '../mail/worker-mail.sender';
import { OutboxKinds } from './outbox-entry';
import { DueMail, OutboxRepository } from './outbox.repository';

/**
 * Sends the outbox of one tenant, one e-mail per transaction: the row stays locked while it
 * is sent, so two workers never send it twice. A failure is tried again later, up to five
 * times; a permanent refusal (an SMTP 5xx, e.g. no such mailbox) is final, and a driver's
 * address that bounced gets no more e-mails about that session (NTF-01).
 */
@Injectable()
export class NotificationSender {
  static readonly MAX_ATTEMPTS = 5;
  static readonly RETRY_BASE_MS = 60_000;
  private readonly logger = new Logger(NotificationSender.name);

  constructor(
    private readonly runner: TransactionRunner,
    private readonly outbox: OutboxRepository,
    private readonly brands: BrandReader,
    private readonly mail: WorkerMailSender,
  ) {}

  /** Sends the next due e-mail. False when there was none. */
  sendNext(tenantId: string, now: Date): Promise<boolean> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      const due = await this.outbox.pickDue(tx, now);
      if (!due) {
        return false;
      }
      if (
        due.alertId &&
        due.kind === 'alert_opened' &&
        (await this.outbox.isAlertClosed(tx, due.alertId))
      ) {
        await this.outbox.cancel(tx, due.id, 'The alert closed before the e-mail was due.');
        return true;
      }
      await this.deliver(tx, due, now);
      return true;
    });
  }

  private async deliver(tx: Transaction, due: DueMail, now: Date): Promise<void> {
    try {
      await this.mail.send(await this.message(tx, due));
      await this.outbox.markSent(tx, due.id, now);
    } catch (error) {
      const isPermanent = MailDeliveryError.isPermanent(error);
      const isLast = isPermanent || due.attempts + 1 >= NotificationSender.MAX_ATTEMPTS;
      const retryAt = isLast
        ? null
        : new Date(now.getTime() + NotificationSender.RETRY_BASE_MS * 2 ** due.attempts);
      await this.outbox.markFailed(tx, due.id, (error as Error).message, retryAt);
      if (isPermanent && due.sessionId && OutboxKinds.isDriverMail(due.kind)) {
        await this.outbox.markUndeliverable(tx, due.sessionId);
      }
      this.logger.warn(`E-mail ${due.id} (${due.kind}) not sent: ${(error as Error).message}`);
    }
  }

  private async message(tx: Transaction, due: DueMail): Promise<MailMessage> {
    const brand = await this.brands.current(tx, due.tenantId);
    const message: MailMessage = {
      to: due.toAddress,
      ...BrandedMailLayout.render(brand, due.content),
    };
    if (OutboxKinds.isDriverMail(due.kind) && brand.supportEmail) {
      message.replyTo = brand.supportEmail;
    }
    if (due.kind === 'scheduled_report' && due.exportId) {
      const file = await this.outbox.findExportFile(tx, due.exportId);
      message.attachments = file
        ? [{ filename: `${file.fileName}.gz`, content: file.data, contentType: 'application/gzip' }]
        : [];
    }
    return message;
  }
}
