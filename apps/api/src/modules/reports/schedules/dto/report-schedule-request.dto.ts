import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { ReportFrequency, UsageGrouping } from '@wattwisely/reports';
import { IsTimeZoneConstraint } from '../../../../common/validation/is-time-zone.constraint';

/** Body of POST and PUT /v1/reports/schedules: a usage report e-mailed weekly or monthly. */
export class ReportScheduleRequestDto {
  @ApiProperty({ example: 'Weekly usage' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ enum: ['weekly', 'monthly'] })
  @IsIn(['weekly', 'monthly'])
  readonly frequency!: ReportFrequency;

  @ApiProperty({ required: false, enum: ['site', 'charger'], default: 'site' })
  @IsOptional()
  @IsIn(['site', 'charger'])
  readonly group_by?: UsageGrouping;

  @ApiProperty({ required: false, nullable: true, description: 'Empty for every site' })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string | null;

  @ApiProperty({ type: [String], example: ['finance@acme.example'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  readonly recipients!: string[];

  @ApiProperty({ example: 'Europe/London', description: 'Weeks and months are counted in it' })
  @IsString()
  @Validate(IsTimeZoneConstraint)
  readonly time_zone!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  readonly is_active?: boolean;
}
