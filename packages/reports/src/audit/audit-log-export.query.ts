import { and, desc, eq, gte, inArray, lt, SQL } from 'drizzle-orm';
import { auditLog, Transaction } from '@wattwisely/db';
import { AuditLogCsvRow } from './audit-log-csv';
import { AuditLogExportFilter } from './audit-log-export-filter';

/** Reads a tenant's audit log for an export, newest first. RLS keeps it inside the tenant. */
export class AuditLogExportQuery {
  static readonly COLUMNS = {
    id: auditLog.id,
    occurredAt: auditLog.occurredAt,
    actorType: auditLog.actorType,
    actorLabel: auditLog.actorLabel,
    action: auditLog.action,
    targetType: auditLog.targetType,
    targetId: auditLog.targetId,
    targetLabel: auditLog.targetLabel,
    before: auditLog.before,
    after: auditLog.after,
    ip: auditLog.ip,
  };

  static rows(
    tx: Transaction,
    filter: AuditLogExportFilter,
    limit: number,
  ): Promise<AuditLogCsvRow[]> {
    return tx
      .select(AuditLogExportQuery.COLUMNS)
      .from(auditLog)
      .where(AuditLogExportQuery.where(filter))
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(limit);
  }

  private static where(filter: AuditLogExportFilter): SQL | undefined {
    const actions = filter.action?.split(',').map((action) => action.trim());
    return and(
      actions ? inArray(auditLog.action, actions) : undefined,
      filter.actorType
        ? eq(auditLog.actorType, filter.actorType as typeof auditLog.actorType._.data)
        : undefined,
      filter.targetType ? eq(auditLog.targetType, filter.targetType) : undefined,
      filter.from ? gte(auditLog.occurredAt, new Date(filter.from)) : undefined,
      filter.to ? lt(auditLog.occurredAt, new Date(filter.to)) : undefined,
    );
  }
}
