import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AlertStatus, AlertType, AlertTypes } from '../alert-types';

/** Query of GET /v1/alerts: the Open, Acknowledged and Closed tabs, newest first. */
export class ListAlertsQueryDto {
  @ApiProperty({ required: false, default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @ApiProperty({ required: false, description: 'next_cursor from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly cursor?: string;

  @ApiProperty({ required: false, enum: AlertTypes.STATUSES })
  @IsOptional()
  @IsIn(AlertTypes.STATUSES)
  readonly status?: AlertStatus;

  @ApiProperty({ required: false, enum: AlertTypes.ALL })
  @IsOptional()
  @IsIn(AlertTypes.ALL)
  readonly type?: AlertType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly charger_id?: string;
}
