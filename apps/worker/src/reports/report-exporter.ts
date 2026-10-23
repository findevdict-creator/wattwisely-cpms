import { Injectable, Logger } from '@nestjs/common';
import { gzipSync } from 'node:zlib';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ReportFileBuilder } from '@wattwisely/reports';
import { ExportFiles } from '../storage/export-files';
import { ExportNotices } from './export-notices';
import { QueuedExport, ReportExportsRepository } from './report-exports.repository';

/**
 * Builds one tenant's queued exports (story SES-04: up to 100,000 rows in the background),
 * one per transaction: the CSV is gzipped into object storage (or into the row without
 * one, module 12), kept for 7 days, and the people it is for are told. An export that
 * fails says why on the Reports page.
 */
@Injectable()
export class ReportExporter {
  static readonly KEEP_MS = 7 * 86_400_000;
  private readonly logger = new Logger(ReportExporter.name);

  constructor(
    private readonly runner: TransactionRunner,
    private readonly exports: ReportExportsRepository,
    private readonly notices: ExportNotices,
    private readonly files: ExportFiles,
  ) {}

  /** The id of the export built or failed, or null when none was queued. */
  async buildNext(tenantId: string, now: Date): Promise<string | null> {
    const picked: { id: string | null } = { id: null };
    try {
      return await this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
        const item = await this.exports.pickQueued(tx);
        if (!item) {
          return null;
        }
        picked.id = item.id;
        await this.build(tx, item, now);
        return item.id;
      });
    } catch (error) {
      const failedId = picked.id;
      if (!failedId) {
        throw error;
      }
      this.logger.warn(`Export ${failedId} failed: ${(error as Error).message}`);
      await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
        this.exports.markFailed(tx, failedId, 'The export could not be built. Try again.'),
      );
      return failedId;
    }
  }

  private async build(tx: Transaction, item: QueuedExport, now: Date): Promise<void> {
    const file = await ReportFileBuilder.build(tx, item.kind, item.parameters, now);
    const gzipped = gzipSync(Buffer.from(file.csv, 'utf8'));
    const built = {
      rowCount: file.rowCount,
      isTruncated: file.isTruncated,
      file: await this.files.keep(item.tenantId, item.id, gzipped),
      sizeBytes: gzipped.length,
      expiresAt: new Date(now.getTime() + ReportExporter.KEEP_MS),
    };
    await this.exports.markReady(tx, item.id, built, now);
    await this.notices.ready(tx, item, file.rowCount);
  }

  /** Expires old exports, then removes their files from object storage. */
  async expire(tenantId: string, now: Date): Promise<number> {
    const keys = await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.exports.expire(tx, now),
    );
    await this.files.discard(keys.filter((key): key is string => key !== null));
    return keys.length;
  }
}
