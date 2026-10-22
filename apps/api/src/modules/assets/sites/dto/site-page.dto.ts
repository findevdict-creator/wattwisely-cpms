import { ApiProperty } from '@nestjs/swagger';
import { SiteDto } from './site.dto';

/** One page of sites. */
export class SitePageDto {
  @ApiProperty({ type: [SiteDto] })
  readonly items: SiteDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: SiteDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
