import { ApiProperty } from '@nestjs/swagger';
import { WebhookDeliveryRecord } from '../webhook-record';

/** One delivery of an event to an endpoint, with the body that was (or will be) sent. */
export class WebhookDeliveryDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'session.completed' })
  readonly event_type: string;

  @ApiProperty({ enum: ['pending', 'delivered', 'failed'] })
  readonly status: string;

  @ApiProperty()
  readonly attempts: number;

  @ApiProperty({ nullable: true, description: 'When the next try is due, while pending' })
  readonly next_attempt_at: string | null;

  @ApiProperty({ nullable: true })
  readonly last_attempt_at: string | null;

  @ApiProperty({ nullable: true, description: 'The HTTP status the endpoint answered' })
  readonly last_status_code: number | null;

  @ApiProperty({ nullable: true, example: 'timed out' })
  readonly last_error: string | null;

  @ApiProperty({ nullable: true })
  readonly delivered_at: string | null;

  @ApiProperty({ type: Object, description: 'The JSON body exactly as it is sent' })
  readonly payload: Record<string, unknown>;

  @ApiProperty()
  readonly created_at: string;

  constructor(record: WebhookDeliveryRecord) {
    this.id = record.id;
    this.event_type = record.eventType;
    this.status = record.status;
    this.attempts = record.attempts;
    this.next_attempt_at = record.status === 'pending' ? record.nextAttemptAt.toISOString() : null;
    this.last_attempt_at = record.lastAttemptAt?.toISOString() ?? null;
    this.last_status_code = record.lastStatusCode;
    this.last_error = record.lastError;
    this.delivered_at = record.deliveredAt?.toISOString() ?? null;
    this.payload = record.payload;
    this.created_at = record.createdAt.toISOString();
  }
}
