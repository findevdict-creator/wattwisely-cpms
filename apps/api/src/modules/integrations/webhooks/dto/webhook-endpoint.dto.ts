import { ApiProperty } from '@nestjs/swagger';
import { WebhookRecord } from '../webhook-record';

/** A webhook endpoint, with its signing secret: the list is for api_keys:manage only. */
export class WebhookEndpointDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'https://hooks.acme.example/wattwisely' })
  readonly url: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({
    example: 'whsec_…',
    description: 'The HMAC-SHA256 key of the Wattwisely-Signature header',
  })
  readonly secret: string;

  @ApiProperty({ type: [String], example: ['session.completed', 'alert.opened'] })
  readonly event_types: string[];

  @ApiProperty({ description: 'A paused endpoint gets no new deliveries; pending ones wait' })
  readonly is_active: boolean;

  @ApiProperty({ description: 'Deliveries that failed in a row since the last that got through' })
  readonly failure_count: number;

  @ApiProperty({ nullable: true })
  readonly last_delivery_at: string | null;

  @ApiProperty({ description: 'Sent back as If-Match when changing or removing the endpoint' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  constructor(record: WebhookRecord) {
    this.id = record.id;
    this.url = record.url;
    this.description = record.description;
    this.secret = record.secret;
    this.event_types = record.eventTypes;
    this.is_active = record.isActive;
    this.failure_count = record.failureCount;
    this.last_delivery_at = record.lastDeliveryAt?.toISOString() ?? null;
    this.version = record.version;
    this.created_at = record.createdAt.toISOString();
  }
}
