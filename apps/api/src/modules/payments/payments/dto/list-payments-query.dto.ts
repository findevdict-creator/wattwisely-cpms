import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Query of GET /v1/payments. Newest payments first. */
export class ListPaymentsQueryDto {
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly session_id?: string;

  @ApiProperty({ required: false, description: 'Comma list, e.g. captured,capture_failed' })
  @IsOptional()
  @Matches(/^[a-z_]+(,[a-z_]+)*$/, { message: 'status must be a comma list of statuses' })
  @MaxLength(200)
  readonly status?: string;

  @ApiProperty({ required: false, description: 'Created at or after (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  readonly from?: string;

  @ApiProperty({ required: false, description: 'Created before (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  readonly to?: string;
}
