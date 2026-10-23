import { ApiProperty } from '@nestjs/swagger';
import { InboxItemDto } from './inbox-item.dto';

/** One page of GET /v1/notifications, with the unread count for the bell. */
export class InboxPageDto {
  @ApiProperty({ type: [InboxItemDto] })
  readonly items: InboxItemDto[];

  @ApiProperty({ nullable: true, description: 'Pass as cursor for the next page' })
  readonly next_cursor: string | null;

  @ApiProperty()
  readonly unread_count: number;

  constructor(items: InboxItemDto[], nextCursor: string | null, unreadCount: number) {
    this.items = items;
    this.next_cursor = nextCursor;
    this.unread_count = unreadCount;
  }
}
