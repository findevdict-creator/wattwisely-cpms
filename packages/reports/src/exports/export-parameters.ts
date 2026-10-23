import { AuditLogExportFilter } from '../audit/audit-log-export-filter';
import { SessionExportFilter } from '../sessions/session-export-filter';
import { UsageGrouping } from '../usage/usage-request';

/** The kinds of file an export or a schedule builds. */
export type ReportKind = 'sessions' | 'usage' | 'audit_log';

/** A usage report as stored with an export or a schedule run. */
export interface UsageExportParameters {
  /** Inclusive (ISO 8601). */
  from: string;
  /** Exclusive (ISO 8601). */
  to: string;
  groupBy: UsageGrouping;
  siteIds: string[] | null;
  siteId?: string;
}

/** What report_exports.parameters holds, by kind. */
export interface ExportParametersByKind {
  sessions: SessionExportFilter;
  usage: UsageExportParameters;
  audit_log: AuditLogExportFilter;
}
