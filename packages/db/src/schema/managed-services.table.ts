import {
  boolean,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { managedServiceStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A managed service agreement between Wattwisely and a tenant (module 10, stories MGT-01 and
 * MGT-05). Wattwisely staff offer it from the admin console; the tenant's Owner accepts it in
 * the portal; either side can give 30 days' notice, after which the worker ends it. A tenant
 * keeps every agreement it ever had, so the audit trail stays complete; at most one is live
 * (pending, active or ending) at a time. A tenant reads its own rows and updates them only
 * through the API's accept and notice flows; the admin console reads and writes all of them.
 */
export const managedServices = pgTable(
  'managed_services',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    status: managedServiceStatus('status').notNull().default('pending_acceptance'),
    /** The Wattwisely staff member the tenant can turn to (their platform_staff row). */
    accountManagerId: uuid('account_manager_id').notNull(),
    /** When the agreement says so, a Managed operator's tariff change waits for the Owner (story MGT-03). */
    isTariffApprovalRequired: boolean('is_tariff_approval_required').notNull().default(true),
    /** The contract's reference, shown to the tenant. */
    agreementReference: text('agreement_reference').notNull().default(''),
    /** Staff notes, never shown to the tenant. */
    notes: text('notes').notNull().default(''),
    offeredBy: uuid('offered_by').references(() => userAccounts.id),
    offeredAt: timestamp('offered_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedBy: uuid('accepted_by').references(() => userAccounts.id),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    noticeGivenBy: uuid('notice_given_by').references(() => userAccounts.id),
    noticeGivenAt: timestamp('notice_given_at', { withTimezone: true }),
    /** Set with the notice: the worker ends the service once this moment has passed. */
    endsAt: timestamp('ends_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    index('managed_services_tenant_idx').on(table.tenantId, table.status),
    index('managed_services_ends_at_idx').on(table.endsAt),
    pgPolicy('managed_services_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('managed_services_tenant_update', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('managed_services_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
