import { ApiProperty } from '@nestjs/swagger';
import { ChargerDto } from './charger.dto';

/** One page of chargers. */
export class ChargerPageDto {
  @ApiProperty({ type: [ChargerDto] })
  readonly items: ChargerDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: ChargerDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
