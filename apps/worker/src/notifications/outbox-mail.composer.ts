import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { BrandedMailLayout, MailAttachment, MailMessage } from '@wattwisely/mail';
import { BrandReader } from '../mail/brand.reader';
import { ExportFiles } from '../storage/export-files';
import { OutboxKinds } from './outbox-entry';
import { DueMail, OutboxRepository } from './outbox.repository';

/**
 * Turns an outbox row into the e-mail to send: the tenant's brand around the content, the
 * operator's support address as reply-to on driver e-mails, and the CSV on a scheduled
 * report, read from object storage or the export's row (module 12).
 */
@Injectable()
export class OutboxMailComposer {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly brands: BrandReader,
    private readonly files: ExportFiles,
  ) {}

  async compose(tx: Transaction, due: DueMail): Promise<MailMessage> {
    const brand = await this.brands.current(tx, due.tenantId);
    const message: MailMessage = {
      to: due.toAddress,
      ...BrandedMailLayout.render(brand, due.content),
    };
    if (OutboxKinds.isDriverMail(due.kind) && brand.supportEmail) {
      message.replyTo = brand.supportEmail;
    }
    if (due.kind === 'scheduled_report' && due.exportId) {
      message.attachments = await this.reportFile(tx, due.exportId);
    }
    return message;
  }

  private async reportFile(tx: Transaction, exportId: string): Promise<MailAttachment[]> {
    const file = await this.outbox.findExportFile(tx, exportId);
    const content = file ? await this.files.read(file) : null;
    return file && content
      ? [{ filename: `${file.fileName}.gz`, content, contentType: ExportFiles.CONTENT_TYPE }]
      : [];
  }
}
