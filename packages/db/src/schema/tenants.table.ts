import { sql } from 'drizzle-orm';
import { integer, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { paymentMode, tenantStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * One row per charge point operator. A global table: it has no tenant_id, every request may
 * read it, and only the admin console (module 9: Wattwisely staff, app.platform_access) may
 * create or change rows. Nothing deletes a tenant: a deleted one keeps its row and slug.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    /** Short unique name, used in URLs and subdomains, e.g. "acme-charging". Unique forever, even after deletion. */
    slug: text('slug').notNull().unique(),
    status: tenantStatus('status').notNull().default('active'),
    region: text('region'),
    /** How drivers pay this tenant (module 6): direct means through the tenant's own Stripe connected account. */
    paymentMode: paymentMode('payment_mode').notNull().default('direct'),
    /** The Keycloak organization for this tenant, used when a tenant brings its own SSO. */
    keycloakOrganizationId: text('keycloak_organization_id').unique(),
    /** When staff suspended it (story ADM-02): deletion is possible 30 days later. */
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  () => [
    pgPolicy('tenants_visible', { for: 'select', to: RowLevelSecurity.APP_ROLE, using: sql`true` }),
    pgPolicy('tenants_platform_insert', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
    pgPolicy('tenants_platform_update', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
