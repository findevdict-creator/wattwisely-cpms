import { Transaction } from '@wattwisely/db';
import { AuditLogCsv } from '../audit/audit-log-csv';
import { AuditLogExportQuery } from '../audit/audit-log-export.query';
import { SessionCsv } from '../sessions/session-csv';
import { SessionExportQuery } from '../sessions/session-export.query';
import { UsageCsv } from '../usage/usage-csv';
import { UsageReportBuilder } from '../usage/usage-report.builder';
import { ExportParametersByKind, ReportKind } from './export-parameters';

/** A finished CSV file. `isTruncated` when there were more rows than an export holds. */
export interface ReportFile {
  csv: string;
  rowCount: number;
  isTruncated: boolean;
}

/**
 * Builds the CSV file of an export (story SES-04: up to 100,000 rows), inside one tenant's
 * transaction. The worker runs it for background exports and scheduled reports.
 */
export class ReportFileBuilder {
  static readonly MAX_ROWS = 100_000;

  static build<K extends ReportKind>(
    tx: Transaction,
    kind: K,
    parameters: ExportParametersByKind[K],
    now: Date,
  ): Promise<ReportFile> {
    if (kind === 'sessions') {
      return ReportFileBuilder.sessions(tx, parameters as ExportParametersByKind['sessions']);
    }
    if (kind === 'audit_log') {
      return ReportFileBuilder.auditLog(tx, parameters as ExportParametersByKind['audit_log']);
    }
    return ReportFileBuilder.usage(tx, parameters as ExportParametersByKind['usage'], now);
  }

  /** "sessions-2026-03-01-to-2026-04-01.csv", from the kind and the period. */
  static fileName(
    kind: ReportKind,
    from: string | undefined,
    to: string | undefined,
    now: Date,
  ): string {
    const day = (value: string | undefined) => (value ? value.slice(0, 10) : '');
    const period =
      from || to ? `${day(from) || 'start'}-to-${day(to) || 'now'}` : day(now.toISOString());
    return `${kind.replace('_', '-')}-${period}.csv`;
  }

  private static async sessions(
    tx: Transaction,
    filter: ExportParametersByKind['sessions'],
  ): Promise<ReportFile> {
    const rows = await SessionExportQuery.rows(tx, filter, ReportFileBuilder.MAX_ROWS + 1);
    const kept = rows.slice(0, ReportFileBuilder.MAX_ROWS);
    return {
      csv: SessionCsv.of(kept),
      rowCount: kept.length,
      isTruncated: rows.length > kept.length,
    };
  }

  private static async auditLog(
    tx: Transaction,
    filter: ExportParametersByKind['audit_log'],
  ): Promise<ReportFile> {
    const rows = await AuditLogExportQuery.rows(tx, filter, ReportFileBuilder.MAX_ROWS + 1);
    const kept = rows.slice(0, ReportFileBuilder.MAX_ROWS);
    return {
      csv: AuditLogCsv.of(kept),
      rowCount: kept.length,
      isTruncated: rows.length > kept.length,
    };
  }

  private static async usage(
    tx: Transaction,
    parameters: ExportParametersByKind['usage'],
    now: Date,
  ): Promise<ReportFile> {
    const report = await UsageReportBuilder.build(tx, {
      from: new Date(parameters.from),
      to: new Date(parameters.to),
      groupBy: parameters.groupBy,
      siteIds: parameters.siteIds,
      siteId: parameters.siteId,
      now,
    });
    return { csv: UsageCsv.of(report), rowCount: report.rows.length, isTruncated: false };
  }
}
