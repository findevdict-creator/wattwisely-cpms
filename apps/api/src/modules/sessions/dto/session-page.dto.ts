import { ApiProperty } from '@nestjs/swagger';
import { SessionDto } from './session.dto';

/** One page of GET /v1/sessions. */
export class SessionPageDto {
  @ApiProperty({ type: [SessionDto] })
  readonly items: SessionDto[];

  @ApiProperty({ nullable: true, description: 'Pass as cursor for the next page' })
  readonly next_cursor: string | null;

  constructor(items: SessionDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
