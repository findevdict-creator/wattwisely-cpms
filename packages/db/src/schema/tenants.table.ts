import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { paymentMode, tenantStatus } from './enums';
import { Timestamps } from './timestamps';

/**
 * One row per charge point operator. A global table: it has no tenant_id and no RLS.
 * The API may only read it; tenants are created by platform admins and seed scripts.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  /** Short unique name, used in URLs and subdomains, e.g. "acme-charging". */
  slug: text('slug').notNull().unique(),
  status: tenantStatus('status').notNull().default('active'),
  region: text('region'),
  /** How drivers pay this tenant (module 6): direct means through the tenant's own Stripe connected account. */
  paymentMode: paymentMode('payment_mode').notNull().default('direct'),
  /** The Keycloak organization for this tenant, used when a tenant brings its own SSO. */
  keycloakOrganizationId: text('keycloak_organization_id').unique(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  ...Timestamps.columns(),
});
