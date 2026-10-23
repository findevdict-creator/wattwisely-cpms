import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ReportKind, UsageGrouping } from '@wattwisely/reports';

/**
 * Body of POST /v1/reports/exports: a file built in the background (story SES-04), with
 * the filters of the page it was started from. sessions needs sessions:export, usage
 * needs reports:read, audit_log needs audit:read.
 */
export class CreateReportExportRequestDto {
  static readonly KINDS = ['sessions', 'usage', 'audit_log'] as const;

  @ApiProperty({ enum: CreateReportExportRequestDto.KINDS })
  @IsIn(CreateReportExportRequestDto.KINDS)
  readonly kind!: ReportKind;

  @ApiProperty({ required: false, description: 'Inclusive (ISO 8601); required for usage' })
  @IsOptional()
  @IsDateString()
  readonly from?: string;

  @ApiProperty({ required: false, description: 'Exclusive (ISO 8601); required for usage' })
  @IsOptional()
  @IsDateString()
  readonly to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string;

  @ApiProperty({ required: false, description: 'sessions only' })
  @IsOptional()
  @IsUUID('all')
  readonly charger_id?: string;

  @ApiProperty({ required: false, description: 'sessions only: comma list of states' })
  @IsOptional()
  @Matches(/^[a-z_]+(,[a-z_]+)*$/, { message: 'status must be a comma list of states' })
  @MaxLength(200)
  readonly status?: string;

  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'sessions only' })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly needs_review?: 'true' | 'false';

  @ApiProperty({ required: false, enum: ['site', 'charger'], description: 'usage only' })
  @IsOptional()
  @IsIn(['site', 'charger'])
  readonly group_by?: UsageGrouping;

  @ApiProperty({ required: false, description: 'audit_log only: comma list of actions' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly action?: string;

  @ApiProperty({ required: false, description: 'audit_log only' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly target_type?: string;
}
