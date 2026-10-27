import { ApiProperty } from '@nestjs/swagger';
import { InboxRecord } from '../inbox.repository';

/** One line in the portal's notification bell. */
export class InboxItemDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'alert_opened' }) readonly kind: string;
  @ApiProperty() readonly title: string;
  @ApiProperty() readonly body: string;
  @ApiProperty({ nullable: true, type: String, description: 'A portal path, e.g. /alerts/{id}' })
  readonly link: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly alert_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly read_at: string | null;
  @ApiProperty() readonly created_at: string;

  constructor(item: InboxRecord) {
    this.id = item.id;
    this.kind = item.kind;
    this.title = item.title;
    this.body = item.body;
    this.link = item.link;
    this.alert_id = item.alertId;
    this.read_at = item.readAt?.toISOString() ?? null;
    this.created_at = item.createdAt.toISOString();
  }
}
