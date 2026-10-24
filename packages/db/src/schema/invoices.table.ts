import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { invoiceStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * An invoice from Wattwisely to a tenant for one calendar month (module 15): the plan's
 * fees, add-ons, the managed service fee and the revenue share, with the tax on top. The
 * worker drafts one per tenant and month; staff check it, issue it (which gives it its
 * number and sends it to the billing contact), mark it paid, or void it. Amounts are integer
 * minor units of `currency`, the plan's currency when the invoice was drafted. A tenant reads
 * its own issued invoices; only platform access writes.
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    /** "WW-2026-0012": given when the invoice is issued; drafts have none. */
    number: text('number'),
    status: invoiceStatus('status').notNull().default('draft'),
    /** The first and last day of the month billed. */
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    currency: text('currency').notNull(),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
    /** The tenant's tax rate when drafted, in basis points, and the tax it makes. */
    taxRateBps: integer('tax_rate_bps').notNull().default(0),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    total: bigint('total', { mode: 'number' }).notNull().default(0),
    /** The billing contact as it was when issued; drafts show the subscription's current one. */
    billingName: text('billing_name'),
    billingEmail: text('billing_email'),
    billingReference: text('billing_reference'),
    /** What the calculator could not do, e.g. sessions in another currency left out. Shown on the invoice. */
    remarks: text('remarks').notNull().default(''),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    issuedBy: uuid('issued_by').references(() => userAccounts.id),
    dueAt: timestamp('due_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidBy: uuid('paid_by').references(() => userAccounts.id),
    /** How it was paid: a bank reference, a cheque number. */
    paymentReference: text('payment_reference'),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidedBy: uuid('voided_by').references(() => userAccounts.id),
    voidReason: text('void_reason'),
    /** Who drafted it: a staff member, or null for the worker. */
    createdBy: uuid('created_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    check('invoices_currency_code', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('invoices_tax_rate_range', sql`${table.taxRateBps} between 0 and 10000`),
    check('invoices_period_order', sql`${table.periodStart} <= ${table.periodEnd}`),
    // A draft has no number yet, an issued or paid invoice has one, a void one keeps whatever it had.
    check(
      'invoices_number_when_issued',
      sql`(${table.status} <> 'draft' or ${table.number} is null) and (${table.status} not in ('issued', 'paid') or ${table.number} is not null)`,
    ),
    uniqueIndex('invoices_number_unique').on(table.number),
    // One live invoice per tenant and month; a voided one can be drafted again.
    uniqueIndex('invoices_period_unique')
      .on(table.tenantId, table.periodStart)
      .where(sql`${table.status} <> 'void'`),
    index('invoices_status_idx').on(table.status, table.dueAt),
    index('invoices_tenant_idx').on(table.tenantId, table.periodStart),
    pgPolicy('invoices_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${RowLevelSecurity.isCurrentTenant(table.tenantId)} and ${table.status} <> 'draft'`,
    }),
    pgPolicy('invoices_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
