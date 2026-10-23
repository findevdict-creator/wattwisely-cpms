import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** The optional fields of a plan, shared by the create and update requests. */
export class PlanFieldsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;

  @ApiProperty({ required: false, example: 'USD' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter code like USD' })
  readonly currency?: string;

  @ApiProperty({ required: false, example: 29900, description: 'Per month, in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  readonly platform_fee?: number;

  @ApiProperty({ required: false, example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  readonly ac_connector_fee?: number;

  @ApiProperty({ required: false, example: 1600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  readonly dc_connector_fee?: number;

  @ApiProperty({ required: false, example: 0, description: 'Basis points, 500 = 5 %' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  readonly revenue_share_bps?: number;

  @ApiProperty({ required: false, nullable: true, example: 500, description: 'Null: unlimited' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  readonly connector_limit?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 5, description: 'Null: unlimited' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  readonly user_limit?: number | null;

  @ApiProperty({ required: false, type: [String], example: ['advanced_reports'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  readonly module_keys?: string[];

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
