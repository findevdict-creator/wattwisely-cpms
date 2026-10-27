import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { webhookDeliveryStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { webhookEndpoints } from './webhook-endpoints.table';

/**
 * One event on its way to one endpoint (module 16). The worker posts the payload, signed,
 * and records the answer; a failure sets the next try with a growing wait, up to the last.
 * The same event never goes to an endpoint twice: event_id names the source (a session
 * state change, an alert's opening or closing), and the pair is unique.
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    endpointId: uuid('endpoint_id').notNull(),
    /** e.g. session.completed, alert.opened, ping. */
    eventType: text('event_type').notNull(),
    /** What the event is about: the state change's id, "<alert id>:opened", or the test's own id. */
    eventId: text('event_id').notNull(),
    /** The JSON body as it is sent; the signature is over these exact bytes. */
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: webhookDeliveryStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    /** The HTTP status the endpoint answered, when it answered. */
    lastStatusCode: integer('last_status_code'),
    /** Why the last try failed, in a few words: "timed out", "ECONNREFUSED", "HTTP 500". */
    lastError: text('last_error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'webhook_deliveries_endpoint_fk',
      columns: [table.tenantId, table.endpointId],
      foreignColumns: [webhookEndpoints.tenantId, webhookEndpoints.id],
    }).onDelete('cascade'),
    uniqueIndex('webhook_deliveries_event_unique').on(table.endpointId, table.eventId),
    index('webhook_deliveries_due_idx')
      .on(table.tenantId, table.nextAttemptAt)
      .where(sql`${table.status} = 'pending'`),
    index('webhook_deliveries_endpoint_idx').on(table.endpointId, table.createdAt.desc()),
    pgPolicy('webhook_deliveries_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
