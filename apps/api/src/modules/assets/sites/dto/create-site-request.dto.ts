import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

/** Body of POST /v1/sites (story AST-01). Name, address and map pin are required. */
export class CreateSiteRequestDto {
  @ApiProperty({ example: 'Riverside Car Park' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ type: SiteAddressDto })
  @ValidateNested()
  @Type(() => SiteAddressDto)
  readonly address!: SiteAddressDto;

  @ApiProperty({ example: 51.5055 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  readonly latitude!: number;

  @ApiProperty({ example: -0.0754 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  readonly longitude!: number;

  @ApiProperty({ example: 'Europe/London', description: 'IANA time zone' })
  @Validate(IsTimeZoneConstraint)
  readonly time_zone!: string;

  @ApiProperty({
    required: false,
    type: OpeningHoursDto,
    description: 'Leave out for 24 hours a day',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  readonly opening_hours?: OpeningHoursDto;

  @ApiProperty({ required: false, enum: ['public', 'private'], default: 'private' })
  @IsOptional()
  @IsIn(['public', 'private'])
  readonly visibility?: 'public' | 'private';

  @ApiProperty({ required: false, example: 600, description: 'Grid connection limit in kW' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  readonly power_limit_kw?: number;

  @ApiProperty({ required: false, example: 'Level -1, bays 40 to 46' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly parking_notes?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'The tariff new sessions here are priced with; null: sessions are not priced',
  })
  @IsOptional()
  @IsUUID()
  readonly tariff_id?: string | null;
}
