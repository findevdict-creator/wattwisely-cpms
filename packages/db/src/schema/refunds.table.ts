import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { refundStatus } from './enums';
import { payments } from './payments.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A refund of a captured payment (Stripe Payments design, "Refunds"). Up to the approval
 * limit it goes to the provider at once; above it a second person, never the requester,
 * must approve. Amounts are minor units of `currency`.
 */
export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    paymentId: uuid('payment_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    reason: text('reason').notNull(),
    status: refundStatus('status').notNull().default('awaiting_approval'),
    requestedBy: uuid('requested_by').references(() => userAccounts.id),
    requestedByLabel: text('requested_by_label').notNull(),
    approvedBy: uuid('approved_by').references(() => userAccounts.id),
    approvedByLabel: text('approved_by_label'),
    /** The provider's id, e.g. re_3Abc…, once sent. */
    providerRefundId: text('provider_refund_id'),
    failureMessage: text('failure_message'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('refunds_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'refunds_payment_fk',
      columns: [table.tenantId, table.paymentId],
      foreignColumns: [payments.tenantId, payments.id],
    }),
    unique('refunds_provider_refund_unique').on(table.tenantId, table.providerRefundId),
    check('refunds_amount_positive', sql`${table.amount} > 0`),
    index('refunds_payment_idx').on(table.tenantId, table.paymentId),
    index('refunds_status_idx').on(table.tenantId, table.status, table.createdAt),
    pgPolicy('refunds_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
