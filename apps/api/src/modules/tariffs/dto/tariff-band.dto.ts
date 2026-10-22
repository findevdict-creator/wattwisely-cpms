import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TariffWeekday } from '@wattwisely/db';

/**
 * One price band: on these days, between these local times, these prices. Unit prices
 * are decimal strings in the tariff's currency with up to four decimals, e.g. "0.3450".
 * An end before the start runs past midnight; "24:00" is midnight.
 */
export class TariffBandDto {
  static readonly DAYS: TariffWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
  static readonly PRICE = /^\d{1,4}(\.\d{1,4})?$/;

  @ApiProperty({ example: 'Peak' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  readonly name!: string;

  @ApiProperty({ enum: TariffBandDto.DAYS, isArray: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(TariffBandDto.DAYS, { each: true })
  readonly days!: TariffWeekday[];

  @ApiProperty({ example: '17:00' })
  @Matches(TariffBandDto.TIME, { message: 'start must be a time like 08:00' })
  readonly start!: string;

  @ApiProperty({ example: '24:00' })
  @Matches(TariffBandDto.TIME, { message: 'end must be a time like 20:00' })
  readonly end!: string;

  @ApiProperty({ example: '0.4000' })
  @Matches(TariffBandDto.PRICE, { message: 'energy_price_per_kwh must be a price like 0.3450' })
  readonly energy_price_per_kwh!: string;

  @ApiProperty({ example: '0.0000' })
  @Matches(TariffBandDto.PRICE, { message: 'time_price_per_hour must be a price like 1.20' })
  readonly time_price_per_hour!: string;

  @ApiProperty({ example: '0.1000' })
  @Matches(TariffBandDto.PRICE, { message: 'idle_fee_per_minute must be a price like 0.10' })
  readonly idle_fee_per_minute!: string;
}
