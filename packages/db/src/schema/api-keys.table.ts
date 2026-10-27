import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A tenant's API keys (module 16, plan module api_keys): bearer tokens for the operator's own
 * systems. Only the SHA-256 of the token is stored; the token itself is shown once, when the
 * key is made. A key holds a chosen set of permissions, fixed when it is made, and acts for
 * the member who made it (created_by), so rows it writes name a person. Revoked keys stay,
 * for the audit trail, and never work again.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** SHA-256 of the whole token, hex. The lookup policy finds the row by it. */
    keyHash: text('key_hash').notNull(),
    /** The last characters of the token, so the list can say which key is which: "…k7q2". */
    keyHint: text('key_hint').notNull(),
    permissionKeys: jsonb('permission_keys')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** The member the key acts for; their account is the actor behind created_by columns. */
    createdBy: uuid('created_by')
      .notNull()
      .references(() => userAccounts.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Moved on at most once a minute, so a busy key does not write a row per request. */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    uniqueIndex('api_keys_hash_unique').on(table.keyHash),
    index('api_keys_tenant_idx').on(table.tenantId, table.createdAt),
    pgPolicy('api_keys_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    /** A request with a token finds its key by the hash, before the tenant is known. */
    pgPolicy('api_keys_lookup', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.keyHash} = ${RowLevelSecurity.currentApiKeyHash()}`,
    }),
    /** The same request moves last_used_at on; nothing else about the row. */
    pgPolicy('api_keys_touch', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.keyHash} = ${RowLevelSecurity.currentApiKeyHash()}`,
      withCheck: sql`${table.keyHash} = ${RowLevelSecurity.currentApiKeyHash()}`,
    }),
  ],
);
