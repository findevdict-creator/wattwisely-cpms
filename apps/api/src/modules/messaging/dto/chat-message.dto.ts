import { ApiProperty } from '@nestjs/swagger';
import { MessageRecord } from '../messaging-record';

/** One message in a conversation. */
export class ChatMessageDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['in', 'out'] })
  readonly direction: 'in' | 'out';

  @ApiProperty({ enum: ['pending', 'sent', 'failed', 'received'] })
  readonly status: string;

  @ApiProperty()
  readonly body: string;

  @ApiProperty({ type: [String], description: 'The quick replies offered under the text' })
  readonly buttons: string[];

  @ApiProperty({ nullable: true })
  readonly error: string | null;

  @ApiProperty({ nullable: true })
  readonly sent_at: string | null;

  @ApiProperty()
  readonly created_at: string;

  constructor(record: MessageRecord) {
    this.id = record.id;
    this.direction = record.direction;
    this.status = record.status;
    this.body = record.body;
    this.buttons = (record.buttons ?? []).map((button) => button.title);
    this.error = record.error;
    this.sent_at = record.sentAt?.toISOString() ?? null;
    this.created_at = record.createdAt.toISOString();
  }
}
