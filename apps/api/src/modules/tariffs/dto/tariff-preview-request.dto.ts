import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, Matches, Max, Min, Validate, ValidateNested } from 'class-validator';
import { IsTimeZoneConstraint } from '../../../common/validation/is-time-zone.constraint';
import { TariffPricesRequestDto } from './tariff-prices-request.dto';

/**
 * Body of POST /v1/tariffs/preview: prices and a made-up session, to see what the
 * session would cost before the prices are saved. Energy flows evenly from start to
 * stop; the car then stays plugged in for `idle_minutes`.
 */
export class TariffPreviewRequestDto {
  @ApiProperty({ example: 'GBP' })
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be an ISO 4217 code like GBP' })
  readonly currency!: string;

  @ApiProperty({ example: 'Europe/London' })
  @Validate(IsTimeZoneConstraint)
  readonly time_zone!: string;

  @ApiProperty({ type: TariffPricesRequestDto })
  @ValidateNested()
  @Type(() => TariffPricesRequestDto)
  readonly prices!: TariffPricesRequestDto;

  @ApiProperty({ example: '2026-03-10T16:30:00Z' })
  @IsDateString()
  readonly started_at!: string;

  @ApiProperty({ example: '2026-03-10T17:30:00Z', description: 'When the charge stops' })
  @IsDateString()
  readonly ended_at!: string;

  @ApiProperty({ example: 22000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  readonly energy_wh!: number;

  @ApiProperty({ example: 25, description: 'Minutes plugged in after the charge stops' })
  @IsInt()
  @Min(0)
  @Max(10_080)
  readonly idle_minutes!: number;
}
