import { integer, pgPolicy, pgTable } from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';

/**
 * The last invoice number given out in each year (module 15): invoice numbers run
 * WW-2026-0001, WW-2026-0002, … without gaps, which a Postgres sequence cannot promise.
 * Issuing an invoice locks the year's row, adds one and uses it. Platform access only.
 */
export const invoiceSequences = pgTable(
  'invoice_sequences',
  {
    year: integer('year').primaryKey(),
    lastNumber: integer('last_number').notNull().default(0),
  },
  () => [
    pgPolicy('invoice_sequences_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
