import { Injectable } from '@nestjs/common';
import { and, asc, eq, lt } from 'drizzle-orm';
import { reportExports, reportSchedules, Transaction, userAccounts } from '@wattwisely/db';
import { ExportParametersByKind, ReportKind } from '@wattwisely/reports';
import { StoredExportFile } from '../storage/export-files';

/** A queued export, locked by the transaction that picked it. */
export interface QueuedExport {
  id: string;
  tenantId: string;
  kind: ReportKind;
  parameters: ExportParametersByKind[ReportKind];
  fileName: string;
  membershipId: string | null;
  requesterEmail: string | null;
  scheduleId: string | null;
  scheduleName: string | null;
  recipients: string[];
}

/** The finished file of an export: its bytes in the row, or its key in object storage. */
export interface BuiltExport {
  file: StoredExportFile;
  sizeBytes: number;
  rowCount: number;
  isTruncated: boolean;
  expiresAt: Date;
}

/** Reads and writes report exports for the export job. Every query runs inside one tenant. */
@Injectable()
export class ReportExportsRepository {
  async pickQueued(tx: Transaction): Promise<QueuedExport | null> {
    const [row] = await tx
      .select({
        id: reportExports.id,
        tenantId: reportExports.tenantId,
        kind: reportExports.kind,
        parameters: reportExports.parameters,
        fileName: reportExports.fileName,
        membershipId: reportExports.membershipId,
        requesterEmail: userAccounts.email,
        scheduleId: reportExports.scheduleId,
        scheduleName: reportSchedules.name,
        recipients: reportSchedules.recipients,
      })
      .from(reportExports)
      .leftJoin(userAccounts, eq(userAccounts.id, reportExports.requestedBy))
      .leftJoin(reportSchedules, eq(reportSchedules.id, reportExports.scheduleId))
      .where(eq(reportExports.status, 'queued'))
      .orderBy(asc(reportExports.createdAt))
      .limit(1)
      .for('update', { of: reportExports, skipLocked: true });
    return row
      ? {
          ...row,
          parameters: row.parameters as ExportParametersByKind[ReportKind],
          recipients: row.recipients ?? [],
        }
      : null;
  }

  async markReady(tx: Transaction, id: string, built: BuiltExport, now: Date): Promise<void> {
    await tx
      .update(reportExports)
      .set({
        status: 'ready',
        data: built.file.data,
        storageKey: built.file.storageKey,
        rowCount: built.rowCount,
        sizeBytes: built.sizeBytes,
        error: built.isTruncated ? 'truncated' : null,
        startedAt: now,
        finishedAt: new Date(),
        expiresAt: built.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(reportExports.id, id));
  }

  async markFailed(tx: Transaction, id: string, error: string): Promise<void> {
    await tx
      .update(reportExports)
      .set({
        status: 'failed',
        error: error.slice(0, 500),
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(reportExports.id, id), eq(reportExports.status, 'queued')));
  }

  /**
   * Old files are dropped; the row stays as a record of the export. Returns the object
   * storage keys of the files to remove once this transaction has committed.
   */
  async expire(tx: Transaction, now: Date): Promise<(string | null)[]> {
    const rows = await tx
      .update(reportExports)
      .set({ status: 'expired', data: null, updatedAt: now })
      .where(and(eq(reportExports.status, 'ready'), lt(reportExports.expiresAt, now)))
      .returning({ storageKey: reportExports.storageKey });
    return rows.map((row) => row.storageKey);
  }
}
