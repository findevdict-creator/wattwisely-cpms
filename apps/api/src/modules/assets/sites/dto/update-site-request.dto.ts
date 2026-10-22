import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { IsTimeZoneConstraint } from '../../../../common/validation/is-time-zone.constraint';
import { OpeningHoursDto } from './opening-hours.dto';
import { SiteAddressDto } from './site-address.dto';

/**
 * Body of PATCH /v1/sites/{id}: only the fields sent change. Send null for
 * opening_hours or power_limit_kw to clear them. Needs the If-Match header.
 */
export class UpdateSiteRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({ required: false, type: SiteAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteAddressDto)
  readonly address?: SiteAddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  readonly latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  readonly longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Validate(IsTimeZoneConstraint)
  readonly time_zone?: string;

  @ApiProperty({ required: false, type: OpeningHoursDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  readonly opening_hours?: OpeningHoursDto | null;

  @ApiProperty({ required: false, enum: ['public', 'private'] })
  @IsOptional()
  @IsIn(['public', 'private'])
  readonly visibility?: 'public' | 'private';

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  readonly power_limit_kw?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly parking_notes?: string;
}
