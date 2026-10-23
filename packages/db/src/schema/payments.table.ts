import { sql } from 'drizzle-orm';
import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargingSessions } from './charging-sessions.table';
import { paymentStatus, paymentType } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * One payment for one session (Stripe Payments design, "Holds, capture and release"):
 * the card hold taken before the charger starts, and what was captured of it after the
 * session was priced. Amounts are minor units of `currency`. The provider's PaymentIntent
 * lives on the tenant's connected account; webhooks are the truth about its state.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    type: paymentType('type').notNull().default('preauth'),
    status: paymentStatus('status').notNull().default('pending'),
    currency: text('currency').notNull(),
    /** The hold asked for; the most that can ever be captured. */
    holdAmount: bigint('hold_amount', { mode: 'number' }).notNull(),
    /** The hold the card confirmed; null until then. */
    authorizedAmount: bigint('authorized_amount', { mode: 'number' }),
    capturedAmount: bigint('captured_amount', { mode: 'number' }),
    refundedAmount: bigint('refunded_amount', { mode: 'number' }).notNull().default(0),
    provider: text('provider').notNull().default('stripe'),
    /** The connected account the PaymentIntent was created on (acct_…). */
    providerAccountId: text('provider_account_id').notNull(),
    /** The provider's id for the hold, e.g. pi_3Abc…. */
    providerPaymentId: text('provider_payment_id').notNull(),
    cardBrand: text('card_brand'),
    cardLast4: text('card_last4'),
    /** The provider's decline code and sentence, when the card refused the hold or the capture. */
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    /** SHA-256 of the key the driver's page holds; it lets the page follow this payment without a login. */
    accessKeyHash: text('access_key_hash').notNull(),
    /** Capture retries: how many so far, and when the worker may try again (72 hours at most). */
    captureAttempts: integer('capture_attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    /** When the worker asked the charger to stop because the cost reached 90% of the hold. */
    autoStopRequestedAt: timestamp('auto_stop_requested_at', { withTimezone: true }),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    /** Why finance should look at it, e.g. capture_above_hold (the price was more than the hold). */
    reviewFlags: jsonb('review_flags').$type<string[]>().notNull().default([]),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('payments_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'payments_session_fk',
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [chargingSessions.tenantId, chargingSessions.id],
    }),
    unique('payments_provider_payment_unique').on(table.tenantId, table.providerPaymentId),
    // One hold per session: a retry after a decline replaces the PaymentIntent, not the row.
    uniqueIndex('payments_session_preauth_unique')
      .on(table.tenantId, table.sessionId)
      .where(sql`${table.type} = 'preauth'`),
    index('payments_status_idx').on(table.tenantId, table.status, table.nextAttemptAt),
    index('payments_created_idx').on(table.tenantId, table.createdAt),
    pgPolicy('payments_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
