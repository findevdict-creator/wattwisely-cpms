import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventDefinition } from '@wattwisely/webhooks';

/** One event type an endpoint can listen for, for the portal's dialog. */
export class WebhookEventTypeDto {
  @ApiProperty({ example: 'session.completed' })
  readonly key: string;

  @ApiProperty({ example: 'Session completed' })
  readonly label: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ enum: ['session', 'alert', 'none'] })
  readonly subject: string;

  constructor(definition: WebhookEventDefinition) {
    this.key = definition.key;
    this.label = definition.label;
    this.description = definition.description;
    this.subject = definition.subject;
  }
}
