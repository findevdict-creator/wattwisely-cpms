import { ApiProperty } from '@nestjs/swagger';
import { TariffDto } from './tariff.dto';

/** One page of tariffs. */
export class TariffPageDto {
  @ApiProperty({ type: [TariffDto] })
  readonly items: TariffDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: TariffDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
