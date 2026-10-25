import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { drivers } from './drivers.table';
import { driverPaymentMode } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A group of drivers and the private sites they may charge at (module 13, story AST-04).
 * A public site admits every active card of the tenant; a private site admits only the
 * drivers of a group that names it. Groups are deleted outright: nothing points at them.
 * Since module 19 a group also carries payment settings for its drivers: whether their
 * sessions are paid, and the hold taken from their saved card before a charge.
 */
export const accessGroups = pgTable(
  'access_groups',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** Whether the sessions of this group's drivers are paid; inherit leaves it to the tenant, which says pay. */
    paymentMode: driverPaymentMode('payment_mode').notNull().default('inherit'),
    /** The hold on a member's saved card in minor units, or null for the tenant's member hold amount. */
    holdAmount: bigint('hold_amount', { mode: 'number' }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('access_groups_tenant_id_unique').on(table.tenantId, table.id),
    uniqueIndex('access_groups_name_unique').on(table.tenantId, sql`lower(${table.name})`),
    check('access_groups_hold_amount_positive', sql`${table.holdAmount} is null or ${table.holdAmount} > 0`),
    pgPolicy('access_groups_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);

/** The sites a group opens. Both keys carry tenant_id, so a group never names another tenant's site. */
export const accessGroupSites = pgTable(
  'access_group_sites',
  {
    tenantId: uuid('tenant_id').notNull(),
    groupId: uuid('group_id').notNull(),
    siteId: uuid('site_id').notNull(),
  },
  (table) => [
    primaryKey({ name: 'access_group_sites_pk', columns: [table.groupId, table.siteId] }),
    foreignKey({
      name: 'access_group_sites_group_fk',
      columns: [table.tenantId, table.groupId],
      foreignColumns: [accessGroups.tenantId, accessGroups.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'access_group_sites_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    pgPolicy('access_group_sites_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);

/** The drivers in a group. */
export const accessGroupMembers = pgTable(
  'access_group_members',
  {
    tenantId: uuid('tenant_id').notNull(),
    groupId: uuid('group_id').notNull(),
    driverId: uuid('driver_id').notNull(),
  },
  (table) => [
    primaryKey({ name: 'access_group_members_pk', columns: [table.groupId, table.driverId] }),
    foreignKey({
      name: 'access_group_members_group_fk',
      columns: [table.tenantId, table.groupId],
      foreignColumns: [accessGroups.tenantId, accessGroups.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'access_group_members_driver_fk',
      columns: [table.tenantId, table.driverId],
      foreignColumns: [drivers.tenantId, drivers.id],
    }),
    pgPolicy('access_group_members_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
