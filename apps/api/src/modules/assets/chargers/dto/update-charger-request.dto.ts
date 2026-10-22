import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Body of PATCH /v1/chargers/{id}: only the fields sent change. Moving a charger to another
 * site needs chargers:write at both sites. Needs the If-Match header.
 */
export class UpdateChargerRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  readonly site_id?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly vendor?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly model?: string | null;

  @ApiProperty({ required: false, enum: ['public', 'private'], nullable: true })
  @IsOptional()
  @IsIn(['public', 'private'])
  readonly visibility_override?: 'public' | 'private' | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readonly allow_plain_ws?: boolean;
}
