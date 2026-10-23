import { index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditActorType } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';

/**
 * Who did what, when, and what changed. Append-only: the API's database role may
 * insert and read rows but never update or delete them (see the grants migration).
 * Rows without a tenant_id are platform actions (a plan edited, a staff member added),
 * written and read only by the admin console (module 9), which also reads every tenant's rows.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    actorType: auditActorType('actor_type').notNull(),
    actorId: uuid('actor_id'),
    /** The actor's name and e-mail at the time, so entries still read well after they leave. */
    actorLabel: text('actor_label').notNull().default(''),
    /** "<area>.<verb>", e.g. "team.member_invited". */
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    targetLabel: text('target_label'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),
    requestId: text('request_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_tenant_time_idx').on(table.tenantId, table.occurredAt.desc(), table.id.desc()),
    index('audit_log_target_idx').on(table.tenantId, table.targetType, table.targetId),
    index('audit_log_actor_idx').on(table.tenantId, table.actorId),
    pgPolicy('audit_log_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('audit_log_tenant_append', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('audit_log_platform_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
    }),
    pgPolicy('audit_log_platform_append', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
