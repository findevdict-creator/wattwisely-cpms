import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TariffBandDto } from './tariff-band.dto';

/**
 * The prices of a tariff version: the body of POST /v1/tariffs/{id}/versions and the
 * `prices` of a new tariff. Amounts are integers in the currency's minor unit (pence,
 * cents); the tax rate is a percentage. The bands must cover every hour of the week once.
 */
export class TariffPricesRequestDto {
  static readonly MAX_AMOUNT = 100_000_000;

  @ApiProperty({ example: '20.00', description: 'Percent, up to two decimals' })
  @Matches(/^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/, {
    message: 'tax_rate must be a percentage like 20 or 7.5',
  })
  readonly tax_rate!: string;

  @ApiProperty({ description: 'true: the prices include tax; false: tax is added on top' })
  @IsBoolean()
  readonly is_tax_included!: boolean;

  @ApiProperty({ example: 0, description: 'Minor units' })
  @IsInt()
  @Min(0)
  @Max(TariffPricesRequestDto.MAX_AMOUNT)
  readonly start_fee!: number;

  @ApiProperty({ example: 15, description: 'Idle minutes before the idle fee starts' })
  @IsInt()
  @Min(0)
  @Max(1440)
  readonly idle_grace_minutes!: number;

  @ApiProperty({ nullable: true, required: false, description: 'Minor units; null: no cap' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TariffPricesRequestDto.MAX_AMOUNT)
  readonly idle_fee_cap?: number | null;

  @ApiProperty({ nullable: true, required: false, description: 'Minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TariffPricesRequestDto.MAX_AMOUNT)
  readonly minimum_price?: number | null;

  @ApiProperty({ nullable: true, required: false, description: 'Minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TariffPricesRequestDto.MAX_AMOUNT)
  readonly maximum_price?: number | null;

  @ApiProperty({ description: 'A session that delivered no energy costs nothing' })
  @IsBoolean()
  readonly is_free_without_energy!: boolean;

  @ApiProperty({ type: [TariffBandDto] })
  @ArrayMinSize(1)
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => TariffBandDto)
  readonly bands!: TariffBandDto[];

  @ApiProperty({ required: false, description: 'Why the prices changed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
