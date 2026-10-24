import { sql } from 'drizzle-orm';
import {
  bigint,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { invoiceLineKind } from './enums';
import { invoices } from './invoices.table';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';

/**
 * The lines of an invoice (module 15), in order. The calculator writes the fee lines when
 * the invoice is drafted or regenerated; staff add adjustments to a draft. Amounts are
 * integer minor units of the invoice's currency; `quantity` × `unit_price` makes `amount`
 * unless the line is prorated or a share, which `details` explains.
 */
export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id),
    position: integer('position').notNull(),
    kind: invoiceLineKind('kind').notNull(),
    description: text('description').notNull(),
    /** Connectors, sites, months; 1 for a fee or an adjustment. */
    quantity: numeric('quantity', { precision: 12, scale: 3, mode: 'number' }).notNull().default(1),
    /** Per unit, before proration; null for a revenue share or an adjustment. */
    unitPrice: integer('unit_price'),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    /** How the amount came about: days prorated, the module key, the revenue the share is of. */
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    unique('invoice_lines_position_unique').on(table.invoiceId, table.position),
    pgPolicy('invoice_lines_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${RowLevelSecurity.isCurrentTenant(table.tenantId)} and ${table.invoiceId} in (select ${invoices.id} from ${invoices} where ${invoices.status} <> 'draft')`,
    }),
    pgPolicy('invoice_lines_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
