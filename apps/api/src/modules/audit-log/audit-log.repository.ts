import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, SQL, sql } from 'drizzle-orm';
import { auditLog, Transaction } from '@wattwisely/db';
import { AuditLogCursor } from './audit-log-cursor';
import { AuditLogRecord } from './audit-log-record';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';

/** The tenant log's filters, plus one tenant for the admin console (which sees every tenant). */
export type AuditLogFilter = ListAuditLogQueryDto & { tenant_id?: string };

/** Reads the audit log: a tenant's own entries (RLS hides the others'), or all of them with platform access. */
@Injectable()
export class AuditLogRepository {
  async findPage(
    tx: Transaction,
    query: AuditLogFilter,
    cursor: AuditLogCursor | null,
    limit: number,
  ): Promise<AuditLogRecord[]> {
    return tx
      .select()
      .from(auditLog)
      .where(and(...AuditLogRepository.filters(query), ...AuditLogRepository.window(query, cursor)))
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<AuditLogRecord | null> {
    const rows = await tx.select().from(auditLog).where(eq(auditLog.id, id));
    return rows[0] ?? null;
  }

  /** Who did what to what. */
  private static filters(query: AuditLogFilter): (SQL | undefined)[] {
    const actions = query.action?.split(',').map((action) => action.trim());
    return [
      query.tenant_id ? eq(auditLog.tenantId, query.tenant_id) : undefined,
      actions ? inArray(auditLog.action, actions) : undefined,
      query.actor_type ? eq(auditLog.actorType, query.actor_type) : undefined,
      query.actor_id ? eq(auditLog.actorId, query.actor_id) : undefined,
      query.target_type ? eq(auditLog.targetType, query.target_type) : undefined,
      query.target_id ? eq(auditLog.targetId, query.target_id) : undefined,
    ];
  }

  /** When: the time range and the page cursor. */
  private static window(query: AuditLogFilter, cursor: AuditLogCursor | null): (SQL | undefined)[] {
    return [
      query.occurred_at_from
        ? gte(auditLog.occurredAt, new Date(query.occurred_at_from))
        : undefined,
      query.occurred_at_to ? lt(auditLog.occurredAt, new Date(query.occurred_at_to)) : undefined,
      cursor
        ? sql`(${auditLog.occurredAt}, ${auditLog.id}) < (${cursor.occurredAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    ];
  }
}
