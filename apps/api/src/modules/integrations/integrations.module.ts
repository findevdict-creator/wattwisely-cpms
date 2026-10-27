import { Module } from '@nestjs/common';
import { ApiKeyChangesService } from './api-keys/api-key-changes.service';
import { ApiKeysController } from './api-keys/api-keys.controller';
import { ApiKeysRepository } from './api-keys/api-keys.repository';
import { ApiKeysService } from './api-keys/api-keys.service';
import { WebhookChangesService } from './webhooks/webhook-changes.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksRepository } from './webhooks/webhooks.repository';
import { WebhooksService } from './webhooks/webhooks.service';

/** API keys and webhooks (module 16): access for the operator's own systems. */
@Module({
  controllers: [ApiKeysController, WebhooksController],
  providers: [
    ApiKeysRepository,
    ApiKeysService,
    ApiKeyChangesService,
    WebhooksRepository,
    WebhooksService,
    WebhookChangesService,
  ],
})
export class IntegrationsModule {}
