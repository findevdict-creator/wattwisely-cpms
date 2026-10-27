import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/notifications: newest first. */
export class ListInboxQueryDto {
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

  @ApiProperty({ required: false, enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly unread?: 'true' | 'false';
}
