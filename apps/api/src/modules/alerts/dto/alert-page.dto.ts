import { ApiProperty } from '@nestjs/swagger';
import { AlertDto } from './alert.dto';

/** One page of GET /v1/alerts. */
export class AlertPageDto {
  @ApiProperty({ type: [AlertDto] })
  readonly items: AlertDto[];

  @ApiProperty({ nullable: true, description: 'Pass as cursor for the next page' })
  readonly next_cursor: string | null;

  constructor(items: AlertDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
