import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** One period a site is open, in its own time zone. "24:00" means until midnight. */
export class OpeningPeriodDto {
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

  @ApiProperty({ example: '08:00' })
  @Matches(OpeningPeriodDto.TIME, { message: 'opens must be HH:MM' })
  readonly opens!: string;

  @ApiProperty({ example: '20:00' })
  @Matches(OpeningPeriodDto.TIME, { message: 'closes must be HH:MM' })
  readonly closes!: string;
}
