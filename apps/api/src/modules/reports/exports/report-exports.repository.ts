import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { reportExports, Transaction, UuidV7 } from '@wattwisely/db';
import { ReportKind } from '@wattwisely/reports';

/** An export as the list shows it. */
export interface ReportExportRecord {
  id: string;
  kind: ReportKind;
  status: string;
  fileName: string;
  rowCount: number | null;
  sizeBytes: number | null;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  expiresAt: Date | null;
}

/** A new export to queue. */
export interface NewExport {
  tenantId: string;
  kind: ReportKind;
  parameters: Record<string, unknown>;
  fileName: string;
  requestedBy: string;
  membershipId: string;
}

/** Queues and reads a member's own exports. The worker builds them. */
@Injectable()
export class ReportExportsRepository {
  static readonly COLUMNS = {
    id: reportExports.id,
    kind: reportExports.kind,
    status: reportExports.status,
    fileName: reportExports.fileName,
    rowCount: reportExports.rowCount,
    sizeBytes: reportExports.sizeBytes,
    error: reportExports.error,
    createdAt: reportExports.createdAt,
    finishedAt: reportExports.finishedAt,
    expiresAt: reportExports.expiresAt,
  };

  async insert(tx: Transaction, entry: NewExport): Promise<ReportExportRecord> {
    const [row] = await tx
      .insert(reportExports)
      .values({ id: UuidV7.create(), ...entry })
      .returning(ReportExportsRepository.COLUMNS);
    return row;
  }

  async countWaiting(tx: Transaction, membershipId: string): Promise<number> {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(reportExports)
      .where(
        and(
          eq(reportExports.membershipId, membershipId),
          inArray(reportExports.status, ['queued', 'running']),
        ),
      );
    return row?.count ?? 0;
  }

  async findMine(
    tx: Transaction,
    membershipId: string,
    limit: number,
  ): Promise<ReportExportRecord[]> {
    return tx
      .select(ReportExportsRepository.COLUMNS)
      .from(reportExports)
      .where(eq(reportExports.membershipId, membershipId))
      .orderBy(desc(reportExports.createdAt))
      .limit(limit);
  }

  async findOne(
    tx: Transaction,
    membershipId: string,
    id: string,
  ): Promise<(ReportExportRecord & { data: Buffer | null; storageKey: string | null }) | null> {
    const [row] = await tx
      .select({
        ...ReportExportsRepository.COLUMNS,
        data: reportExports.data,
        storageKey: reportExports.storageKey,
      })
      .from(reportExports)
      .where(and(eq(reportExports.id, id), eq(reportExports.membershipId, membershipId)));
    return row ?? null;
  }
}
