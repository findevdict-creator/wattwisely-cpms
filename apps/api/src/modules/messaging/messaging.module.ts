import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ChannelResolver } from './channel.resolver';
import { ChannelWriter } from './channel.writer';
import { ChatReplier } from './chat-replier';
import { ConversationStore } from './conversation.store';
import { ConversationsService } from './conversations.service';
import { InboundMessageHandler } from './inbound-message.handler';
import { MessagingChannelService } from './messaging-channel.service';
import { MessagingController } from './messaging.controller';
import { MessagingRepository } from './messaging.repository';
import { PlugLookup } from './plug.lookup';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

/**
 * Charging through a messaging app (module 17, add-on messaging_charging): the tenant's
 * WhatsApp channel, Meta's webhook, and the replies drivers get. Sending is the worker's.
 */
@Module({
  imports: [PaymentsModule],
  controllers: [MessagingController, WhatsAppWebhookController],
  providers: [
    MessagingRepository,
    ChannelResolver,
    ChannelWriter,
    ConversationStore,
    PlugLookup,
    ChatReplier,
    InboundMessageHandler,
    MessagingChannelService,
    ConversationsService,
    WhatsAppWebhookService,
  ],
})
export class MessagingModule {}
