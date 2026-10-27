import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgPolicy,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { messagingProvider } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A tenant's number on a messaging app (module 17, the messaging-app charging add-on): the
 * WhatsApp Business phone number drivers write to. One per tenant. Inbound messages name the
 * provider's `phone_number_id`, which is how the webhook finds the tenant before it knows it;
 * outbound messages are sent with the platform's access token unless the tenant brought its own.
 */
export const messagingChannels = pgTable(
  'messaging_channels',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    provider: messagingProvider('provider').notNull().default('whatsapp'),
    /** The provider's id of the number, e.g. WhatsApp's phone number id; what inbound webhooks carry. */
    phoneNumberId: text('phone_number_id').notNull(),
    /** The number as drivers dial it, in E.164 without the plus, e.g. 447700900123. */
    displayPhoneNumber: text('display_phone_number').notNull(),
    /** The tenant's own access token for its WhatsApp Business account; empty means the platform's token. */
    accessToken: text('access_token').notNull().default(''),
    /** A line of the tenant's own at the top of the first reply, e.g. opening hours. */
    greeting: text('greeting').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('messaging_channels_tenant_unique').on(table.tenantId),
    unique('messaging_channels_tenant_id_unique').on(table.tenantId, table.id),
    // One number serves one tenant on the whole platform.
    uniqueIndex('messaging_channels_phone_number_unique').on(
      table.provider,
      sql`lower(${table.phoneNumberId})`,
    ),
    pgPolicy('messaging_channels_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    // An inbound message names only the number it came to; the webhook may read that one channel
    // to learn its tenant, then switches to the tenant for everything else.
    pgPolicy('messaging_channels_phone_number_lookup', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`lower(${table.phoneNumberId}) = lower(${RowLevelSecurity.currentMessagingPhoneNumberId()})`,
    }),
  ],
);
