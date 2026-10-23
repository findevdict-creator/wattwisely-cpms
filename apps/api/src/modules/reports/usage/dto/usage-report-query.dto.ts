import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { UsageGrouping } from '@wattwisely/reports';

/** Query of GET /v1/reports/usage and its CSV: a period of at most a year. */
export class UsageReportQueryDto {
  @ApiProperty({ description: 'Inclusive (ISO 8601)', example: '2026-03-01T00:00:00Z' })
  @IsDateString()
  readonly from!: string;

  @ApiProperty({ description: 'Exclusive (ISO 8601)', example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  readonly to!: string;

  @ApiProperty({ required: false, enum: ['site', 'charger'], default: 'site' })
  @IsOptional()
  @IsIn(['site', 'charger'])
  readonly group_by?: UsageGrouping;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string;
}
