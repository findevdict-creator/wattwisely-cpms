import { ApiProperty } from '@nestjs/swagger';
import { OcppMessageRecord } from '../ocpp-message-record';

/** One OCPP frame as GET /v1/chargers/{id}/messages returns it. */
export class OcppMessageDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['in', 'out'], description: 'in: from the charger; out: to it' })
  readonly direction: string;

  @ApiProperty({ enum: ['call', 'call_result', 'call_error'] })
  readonly message_type: string;

  @ApiProperty({ description: 'The OCPP-J id that pairs a call with its result' })
  readonly message_id: string;

  @ApiProperty({ example: 'StatusNotification' })
  readonly action: string;

  @ApiProperty({ description: 'The payload as sent; for an error: code, description and details' })
  readonly payload: unknown;

  @ApiProperty({ nullable: true, example: 'FormationViolation' })
  readonly error_code: string | null;

  @ApiProperty()
  readonly received_at: string;

  constructor(message: OcppMessageRecord) {
    this.id = message.id;
    this.direction = message.direction;
    this.message_type = message.messageType;
    this.message_id = message.messageId;
    this.action = message.action;
    this.payload = message.payload;
    this.error_code = message.errorCode;
    this.received_at = message.receivedAt.toISOString();
  }
}
