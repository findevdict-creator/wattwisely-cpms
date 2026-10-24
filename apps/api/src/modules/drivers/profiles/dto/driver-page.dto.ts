import { ApiProperty } from '@nestjs/swagger';
import { DriverDto } from './driver.dto';

/** One page of GET /v1/drivers, by name. */
export class DriverPageDto {
  @ApiProperty({ type: [DriverDto] })
  readonly items: DriverDto[];

  @ApiProperty({ nullable: true, description: 'Pass as cursor for the next page' })
  readonly next_cursor: string | null;

  constructor(items: DriverDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
