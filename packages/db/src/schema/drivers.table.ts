import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { driverStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A driver known to the tenant (module 13): a person or a pool vehicle whose RFID cards
 * may charge at the tenant's sites. Name and reference are what staff see; e-mail and
 * phone are personal data, shown only with drivers:read_personal. Drivers are soft-deleted,
 * so past sessions keep their name. Blocking a driver blocks every card they hold.
 */
export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    /** The tenant's own id for the driver: an employee number, a fleet plate. */
    reference: text('reference').notNull().default(''),
    notes: text('notes').notNull().default(''),
    status: driverStatus('status').notNull().default('active'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    blockedBy: uuid('blocked_by').references(() => userAccounts.id),
    blockReason: text('block_reason').notNull().default(''),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    // Cards, group memberships and sessions point at (tenant_id, id).
    unique('drivers_tenant_id_unique').on(table.tenantId, table.id),
    // One profile per e-mail address among the tenant's drivers that are not deleted.
    uniqueIndex('drivers_email_unique')
      .on(table.tenantId, sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} is null and ${table.email} is not null`),
    index('drivers_name_idx').on(table.tenantId, sql`lower(${table.name})`),
    pgPolicy('drivers_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
