import { Injectable } from '@nestjs/common';
import { staffNotifications, Transaction, UuidV7 } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';
import { OutboxWriter } from '../notifications/outbox.writer';
import { QueuedExport } from './report-exports.repository';

/**
 * Tells people a file is ready (story SES-04): the member who asked gets a line in their
 * inbox and an e-mail with a link to the Reports page; a scheduled report goes to its
 * recipients with the file attached.
 */
@Injectable()
export class ExportNotices {
  constructor(
    private readonly config: WorkerConfig,
    private readonly outbox: OutboxWriter,
  ) {}

  async ready(tx: Transaction, item: QueuedExport, rowCount: number): Promise<void> {
    if (item.scheduleId) {
      await this.scheduled(tx, item);
      return;
    }
    if (item.membershipId) {
      await this.toInbox(tx, item, item.membershipId, rowCount);
    }
    if (item.requesterEmail) {
      await this.toEmail(tx, item, item.requesterEmail, rowCount);
    }
  }

  private async toInbox(
    tx: Transaction,
    item: QueuedExport,
    membershipId: string,
    rowCount: number,
  ) {
    await tx.insert(staffNotifications).values({
      id: UuidV7.create(),
      tenantId: item.tenantId,
      membershipId,
      kind: 'export_ready',
      title: `Your export ${item.fileName} is ready`,
      body: `${rowCount} rows. It can be downloaded for 7 days.`,
      link: ExportNotices.link(item),
    });
  }

  private async toEmail(tx: Transaction, item: QueuedExport, email: string, rowCount: number) {
    const portalUrl = this.config.portalUrl.replace(/\/+$/, '');
    await this.outbox.enqueue(tx, {
      tenantId: item.tenantId,
      kind: 'export_ready',
      dedupeKey: `export:${item.id}`,
      toAddress: email,
      exportId: item.id,
      membershipId: item.membershipId ?? undefined,
      content: {
        subject: `Your export ${item.fileName} is ready`,
        headline: 'Your export is ready',
        paragraphs: [`${item.fileName} has ${rowCount} rows.`],
        action: { label: 'Download it', url: `${portalUrl}${ExportNotices.link(item)}` },
        footnote: 'The file can be downloaded from the Reports page for 7 days, after signing in.',
      },
    });
  }

  private static link(item: QueuedExport): string {
    return `/reports?export=${item.id}`;
  }

  private async scheduled(tx: Transaction, item: QueuedExport): Promise<void> {
    for (const recipient of item.recipients) {
      await this.outbox.enqueue(tx, {
        tenantId: item.tenantId,
        kind: 'scheduled_report',
        dedupeKey: `export:${item.id}:${recipient.toLowerCase()}`,
        toAddress: recipient,
        exportId: item.id,
        content: {
          subject: `${item.scheduleName ?? 'Scheduled report'}: ${item.fileName}`,
          headline: item.scheduleName ?? 'Your scheduled report',
          paragraphs: ['The report is attached as a CSV file (gzip compressed).'],
          footnote: 'You get this because you are a recipient of this scheduled report.',
        },
      });
    }
  }
}
