import { Injectable, Logger } from '@nestjs/common';
import { gzipSync } from 'node:zlib';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ReportFileBuilder } from '@wattwisely/reports';
import { ExportNotices } from './export-notices';
import { ReportExportsRepository } from './report-exports.repository';

/**
 * Builds one tenant's queued exports (story SES-04: up to 100,000 rows in the background),
 * one per transaction: the CSV is gzipped into the row, kept for 7 days, and the people it
 * is for are told. An export that fails says why on the Reports page.
 */
@Injectable()
export class ReportExporter {
  static readonly KEEP_MS = 7 * 86_400_000;
  private readonly logger = new Logger(ReportExporter.name);

  constructor(
    private readonly runner: TransactionRunner,
    private readonly exports: ReportExportsRepository,
    private readonly notices: ExportNotices,
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
        const file = await ReportFileBuilder.build(tx, item.kind, item.parameters, now);
        const data = gzipSync(Buffer.from(file.csv, 'utf8'));
        const expiresAt = new Date(now.getTime() + ReportExporter.KEEP_MS);
        await this.exports.markReady(tx, item.id, { ...file, data, expiresAt }, now);
        await this.notices.ready(tx, item, file.rowCount);
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

  expire(tenantId: string, now: Date): Promise<number> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.exports.expire(tx, now),
    );
  }
}
