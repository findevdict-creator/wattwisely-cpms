import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Body of PATCH /v1/admin/tenants/{id}: the company's details. The short name never changes. */
export class UpdateTenantRequestDto {
  @ApiProperty({ required: false, example: 'Acme Charging' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  readonly name?: string;

  @ApiProperty({ required: false, nullable: true, example: 'DE' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^[A-Z]{2}$/, { message: 'region must be a two-letter country code' })
  readonly region?: string | null;

  @ApiProperty({ required: false, enum: ['direct', 'managed'] })
  @IsOptional()
  @IsIn(['direct', 'managed'])
  readonly payment_mode?: 'direct' | 'managed';
}
