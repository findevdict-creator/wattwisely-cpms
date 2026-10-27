import { ApiProperty } from '@nestjs/swagger';
import { ConversationRecord } from '../messaging-record';

/** A driver's conversation on the tenant's channel. */
export class ConversationDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: '447700900123', description: 'The driver’s number, digits only' })
  readonly contact: string;

  @ApiProperty({ nullable: true, description: 'The plug the chat is about' })
  readonly charger_identity: string | null;

  @ApiProperty({ nullable: true })
  readonly ocpp_connector_id: number | null;

  @ApiProperty({ nullable: true, description: 'The charge started from this chat' })
  readonly session_id: string | null;

  @ApiProperty({ nullable: true })
  readonly session_status: string | null;

  @ApiProperty({ nullable: true })
  readonly last_inbound_at: string | null;

  @ApiProperty({ nullable: true })
  readonly last_outbound_at: string | null;

  @ApiProperty()
  readonly updated_at: string;

  constructor(record: ConversationRecord) {
    this.id = record.id;
    this.contact = record.contact;
    this.charger_identity = record.chargerIdentity;
    this.ocpp_connector_id = record.ocppConnectorId;
    this.session_id = record.sessionId || null;
    this.session_status = record.sessionStatus;
    this.last_inbound_at = record.lastInboundAt?.toISOString() ?? null;
    this.last_outbound_at = record.lastOutboundAt?.toISOString() ?? null;
    this.updated_at = record.updatedAt.toISOString();
  }
}
