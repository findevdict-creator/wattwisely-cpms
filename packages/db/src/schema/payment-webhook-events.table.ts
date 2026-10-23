import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/**
 * Every webhook event the payment provider sent, stored once (Stripe Payments design,
 * "Webhooks"). A global table: the event arrives before its tenant is known, and the
 * unique event id is what makes a redelivery harmless. The API handles the event right
 * away; one it could not handle is retried by the worker until processed_at is set.
 */
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').primaryKey(),
    provider: text('provider').notNull().default('stripe'),
    /** The provider's event id, e.g. evt_1Abc…. */
    eventId: text('event_id').notNull(),
    type: text('type').notNull(),
    /** The connected account the event is about (acct_…), when it is about one. */
    providerAccountId: text('provider_account_id'),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('payment_webhook_events_event_unique').on(table.provider, table.eventId),
    index('payment_webhook_events_pending_idx')
      .on(table.nextAttemptAt)
      .where(sql`${table.processedAt} is null`),
  ],
);
