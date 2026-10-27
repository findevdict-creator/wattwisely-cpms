import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/drivers: by name, narrowed by a search, a status or a group. */
export class ListDriversQueryDto {
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

  @ApiProperty({ required: false, description: 'Part of the name, e-mail or reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;

  @ApiProperty({ required: false, enum: ['active', 'blocked'] })
  @IsOptional()
  @IsIn(['active', 'blocked'])
  readonly status?: 'active' | 'blocked';

  @ApiProperty({ required: false, description: 'Only the drivers of this access group' })
  @IsOptional()
  @IsUUID('all')
  readonly group_id?: string;
}
