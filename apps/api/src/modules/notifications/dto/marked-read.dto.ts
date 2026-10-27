import { ApiProperty } from '@nestjs/swagger';

/** How many lines were marked read, and how many are left unread. */
export class MarkedReadDto {
  @ApiProperty() readonly marked: number;
  @ApiProperty() readonly unread_count: number;

  constructor(marked: number, unreadCount: number) {
    this.marked = marked;
    this.unread_count = unreadCount;
  }
}
