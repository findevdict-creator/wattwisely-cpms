import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/sites (API Design, "Sites"). Sorted by name. */
export class ListSitesQueryDto {
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
  @MaxLength(300)
  readonly cursor?: string;

  @ApiProperty({ required: false, enum: ['public', 'private'] })
  @IsOptional()
  @IsIn(['public', 'private'])
  readonly visibility?: 'public' | 'private';

  @ApiProperty({ required: false, description: 'Searches name and address' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;
}
