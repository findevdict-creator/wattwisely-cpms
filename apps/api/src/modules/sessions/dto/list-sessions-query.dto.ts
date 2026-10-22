import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Query of GET /v1/sessions and GET /v1/sessions/export. Newest sessions first. */
export class ListSessionsQueryDto {
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
  readonly charger_id?: string;

  @ApiProperty({ required: false, description: 'Comma list, e.g. charging,idle' })
  @IsOptional()
  @Matches(/^[a-z_]+(,[a-z_]+)*$/, { message: 'status must be a comma list of states' })
  @MaxLength(200)
  readonly status?: string;

  @ApiProperty({ required: false, description: 'Started at or after (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  readonly from?: string;

  @ApiProperty({ required: false, description: 'Started before (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  readonly to?: string;

  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'Only flagged sessions' })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly needs_review?: 'true' | 'false';
}
