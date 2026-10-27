import { integer, pgView, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * What the admin console shows about each tenant's size, without personal data (story ADM-04):
 * counted across every tenant. The view is created by migration 0014 and owned by the
 * migrator role, so it reads under the owner's rights and row-level security does not
 * hide other tenants' rows from it; the API may only SELECT from it.
 */
export const platformTenantOverview = pgView('platform_tenant_overview', {
  tenantId: uuid('tenant_id').notNull(),
  memberCount: integer('member_count').notNull(),
  invitedCount: integer('invited_count').notNull(),
  siteCount: integer('site_count').notNull(),
  chargerCount: integer('charger_count').notNull(),
  acConnectorCount: integer('ac_connector_count').notNull(),
  dcConnectorCount: integer('dc_connector_count').notNull(),
  lastSessionAt: timestamp('last_session_at', { withTimezone: true }),
}).existing();
