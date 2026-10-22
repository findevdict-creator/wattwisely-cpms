import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/tariffs. Sorted by name; active tariffs unless status says otherwise. */
export class ListTariffsQueryDto {
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

  @ApiProperty({ required: false, enum: ['active', 'archived'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'archived'])
  readonly status?: 'active' | 'archived';
}
