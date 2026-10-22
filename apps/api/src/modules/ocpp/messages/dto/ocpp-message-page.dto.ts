import { ApiProperty } from '@nestjs/swagger';
import { OcppMessageDto } from './ocpp-message.dto';

/** One page of a charger's message log, newest first. */
export class OcppMessagePageDto {
  @ApiProperty({ type: [OcppMessageDto] })
  readonly items: OcppMessageDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: OcppMessageDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
