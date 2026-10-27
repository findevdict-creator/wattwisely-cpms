import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { messagingChannels } from './messaging-channels.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * One driver's chat with a tenant's number (module 17): who is writing, the plug they named
 * last, and the charge the chat is about. The driver pays and starts on the charge page the
 * chat links to; the link carries `link_token`, so the page can tie the session back to the
 * chat, and the worker then tells the driver how the charge is going, in the chat.
 */
export const messagingConversations = pgTable(
  'messaging_conversations',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    /** The driver's number as the provider reports it: digits only, country code first. */
    contact: text('contact').notNull(),
    /** The plug the driver named last, when it was one of the tenant's. */
    chargerId: uuid('charger_id'),
    connectorId: uuid('connector_id'),
    /** The session the chat is about, once the driver started one through the chat's link. */
    sessionId: uuid('session_id'),
    /** The charge key of that session, for the stop and the receipt link; the chat is the driver's. */
    chargeKey: text('charge_key'),
    /** Random; the charge page sends it back when the driver starts, to tie the session to this chat. */
    linkToken: text('link_token').notNull(),
    /** The session updates already sent (started, finished, receipt), so each goes once. */
    notifiedKinds: jsonb('notified_kinds')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('messaging_conversations_contact_unique').on(table.channelId, table.contact),
    unique('messaging_conversations_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'messaging_conversations_channel_fk',
      columns: [table.tenantId, table.channelId],
      foreignColumns: [messagingChannels.tenantId, messagingChannels.id],
    }).onDelete('cascade'),
    index('messaging_conversations_session_idx').on(table.tenantId, table.sessionId),
    index('messaging_conversations_recent_idx').on(table.tenantId, table.updatedAt),
    pgPolicy('messaging_conversations_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
