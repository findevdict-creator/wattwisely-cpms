import { sql } from 'drizzle-orm';
import { check, integer, pgPolicy, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { bytea } from './bytea';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * How a tenant presents itself to drivers (white-labelling design, "Branded" level,
 * module 8): the name drivers see, two colours, a logo and a support contact. One row per
 * tenant, created the first time someone saves; a tenant without a row gets the platform's
 * defaults and its own name. The logo is stored here as bytes (at most 512 KB) and served
 * by the API; object storage can take it over later without changing the API's answers.
 */
export const tenantBranding = pgTable(
  'tenant_branding',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    /** The name drivers see; null means the tenant's own name. */
    displayName: text('display_name'),
    /** Colours as #rrggbb, lower case; null means the platform's default. */
    primaryColor: text('primary_color'),
    accentColor: text('accent_color'),
    supportEmail: text('support_email'),
    supportPhone: text('support_phone'),
    supportUrl: text('support_url'),
    /** The logo: image/png, image/jpeg, image/svg+xml or image/webp; all three null without one. */
    logoContentType: text('logo_content_type'),
    logoData: bytea('logo_data'),
    /** The first 16 hex digits of the SHA-256 of the bytes: the cache key in the logo's URL. */
    logoEtag: text('logo_etag'),
    logoSizeBytes: integer('logo_size_bytes'),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('tenant_branding_tenant_unique').on(table.tenantId),
    check(
      'tenant_branding_logo_complete',
      sql`(${table.logoData} IS NULL) = (${table.logoContentType} IS NULL) AND (${table.logoData} IS NULL) = (${table.logoEtag} IS NULL)`,
    ),
    pgPolicy('tenant_branding_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
