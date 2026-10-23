import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

/** Body of PATCH /v1/admin/addons/{key}: the price and whether the add-on is sold. */
export class UpdateAddonRequestDto {
  @ApiProperty({
    required: false,
    example: 300,
    description: 'Per month per pricing_unit, in minor units',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  readonly price?: number;

  @ApiProperty({ required: false, example: 'USD' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter code like USD' })
  readonly currency?: string;

  @ApiProperty({ required: false, enum: ['per_connector', 'per_site', 'per_tenant'] })
  @IsOptional()
  @IsIn(['per_connector', 'per_site', 'per_tenant'])
  readonly pricing_unit?: 'per_connector' | 'per_site' | 'per_tenant';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readonly is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  readonly sort_order?: number;
}
