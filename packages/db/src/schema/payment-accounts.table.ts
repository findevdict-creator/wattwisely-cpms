import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { paymentAccountStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/** What the provider still wants from the tenant before (or to keep) taking charges. */
export interface PaymentAccountRequirements {
  currentlyDue: string[];
  pastDue: string[];
  disabledReason: string | null;
}

/**
 * The tenant's connected account at the payment provider (Stripe Payments design,
 * "Tenant onboarding with Stripe Connect"): one per tenant. Stripe holds the identity,
 * business and bank details; this row keeps only the account id and whether it may
 * take charges, copied from account.updated webhooks and manual refreshes.
 */
export const paymentAccounts = pgTable(
  'payment_accounts',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    provider: text('provider').notNull().default('stripe'),
    /** The provider's id, e.g. acct_1Abc…; every PaymentIntent of the tenant lives on it. */
    providerAccountId: text('provider_account_id').notNull(),
    status: paymentAccountStatus('status').notNull().default('pending'),
    isChargesEnabled: boolean('is_charges_enabled').notNull().default(false),
    isPayoutsEnabled: boolean('is_payouts_enabled').notNull().default(false),
    isDetailsSubmitted: boolean('is_details_submitted').notNull().default(false),
    requirements: jsonb('requirements')
      .$type<PaymentAccountRequirements>()
      .notNull()
      .default({ currentlyDue: [], pastDue: [], disabledReason: null }),
    /** ISO 3166-1 alpha-2, chosen when connecting; Stripe needs it to create the account. */
    country: text('country').notNull(),
    /** The account's settlement currency as Stripe reports it, once known. */
    defaultCurrency: text('default_currency'),
    /** The card hold taken before a charge, in minor units of the tariff currency (50.00 by default). */
    holdAmount: bigint('hold_amount', { mode: 'number' }).notNull().default(5000),
    connectedBy: uuid('connected_by').references(() => userAccounts.id),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('payment_accounts_tenant_unique').on(table.tenantId),
    unique('payment_accounts_provider_account_unique').on(table.provider, table.providerAccountId),
    check('payment_accounts_hold_positive', sql`${table.holdAmount} > 0`),
    pgPolicy('payment_accounts_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    // A webhook names only the connected account; the API may read that one row to learn
    // its tenant, then switches to the tenant for everything else.
    pgPolicy('payment_accounts_provider_lookup', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.providerAccountId} = ${RowLevelSecurity.currentProviderAccountId()}`,
    }),
  ],
);
