import { ApiProperty } from '@nestjs/swagger';
import { CommandDto } from './command.dto';

/** One page of a charger's command history, newest first. */
export class CommandPageDto {
  @ApiProperty({ type: [CommandDto] })
  readonly items: CommandDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: CommandDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
