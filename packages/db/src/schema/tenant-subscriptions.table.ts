import { integer, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { subscriptionStatus } from './enums';
import { plans } from './plans.table';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A tenant's plan and billing contact (module 9): one row per tenant, set by Wattwisely
 * staff. A tenant reads its own row (Settings, Plan); the admin console reads and writes
 * every tenant's. Invoicing itself (Lago) is a later module; this row is what it will bill.
 */
export const tenantSubscriptions = pgTable(
  'tenant_subscriptions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    /** Only while status is trialing. */
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    /** Where Wattwisely's invoices go, and the legal name and reference (VAT or PO number) on them. */
    billingEmail: text('billing_email'),
    billingName: text('billing_name'),
    billingReference: text('billing_reference'),
    /** Staff notes, e.g. the contract's terms. Never shown to the tenant. */
    notes: text('notes').notNull().default(''),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    pgPolicy('tenant_subscriptions_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('tenant_subscriptions_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
