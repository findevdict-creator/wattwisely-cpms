import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * Where a tenant wants to hear about events (module 16): an HTTPS address, the event types
 * it asked for and the secret every delivery is signed with. The worker scans each tenant's
 * sessions and alerts for events after `scanned_to`, queues a delivery per endpoint that
 * listens for the type, and moves the mark on, so an endpoint added today never gets
 * yesterday's events.
 */
export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    url: text('url').notNull(),
    description: text('description').notNull().default(''),
    /** The HMAC-SHA256 key of the Wattwisely-Signature header; shown to api_keys:manage in the portal. */
    secret: text('secret').notNull(),
    eventTypes: jsonb('event_types')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    /** Events up to this moment have been looked at for this endpoint. */
    scannedTo: timestamp('scanned_to', { withTimezone: true }).notNull().defaultNow(),
    /** Deliveries that failed in a row since the last one that got through. */
    failureCount: integer('failure_count').notNull().default(0),
    lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('webhook_endpoints_tenant_id_unique').on(table.tenantId, table.id),
    index('webhook_endpoints_tenant_idx').on(table.tenantId, table.createdAt),
    pgPolicy('webhook_endpoints_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
