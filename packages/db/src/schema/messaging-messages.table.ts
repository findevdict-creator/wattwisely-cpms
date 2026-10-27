import { sql } from 'drizzle-orm';
import {
  foreignKey,
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
import { messagingDirection, messagingMessageStatus } from './enums';
import { messagingConversations } from './messaging-conversations.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/** A quick reply the driver can tap instead of typing, e.g. "Stop charging". */
export interface MessagingButton {
  id: string;
  title: string;
}

/**
 * Every chat message in or out (module 17). Inbound ones are stored as they arrive, once per
 * provider message id, so a webhook delivered twice changes nothing. Outbound ones are an outbox:
 * the API and the worker write them `pending`, the worker's send job posts them to the provider
 * and tries again a few times when it does not answer.
 */
export const messagingMessages = pgTable(
  'messaging_messages',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    conversationId: uuid('conversation_id').notNull(),
    direction: messagingDirection('direction').notNull(),
    status: messagingMessageStatus('status').notNull(),
    body: text('body').notNull(),
    buttons: jsonb('buttons').$type<MessagingButton[]>(),
    /** The provider's id of the message: what came in, or what the provider answered on send. */
    providerMessageId: text('provider_message_id'),
    error: text('error'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'messaging_messages_conversation_fk',
      columns: [table.tenantId, table.conversationId],
      foreignColumns: [messagingConversations.tenantId, messagingConversations.id],
    }).onDelete('cascade'),
    // A webhook delivered twice stores the inbound message once.
    uniqueIndex('messaging_messages_provider_unique')
      .on(table.tenantId, table.providerMessageId)
      .where(sql`${table.direction} = 'in' and ${table.providerMessageId} is not null`),
    index('messaging_messages_conversation_idx').on(table.conversationId, table.createdAt),
    index('messaging_messages_pending_idx')
      .on(table.tenantId, table.nextAttemptAt)
      .where(sql`${table.status} = 'pending'`),
    pgPolicy('messaging_messages_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
