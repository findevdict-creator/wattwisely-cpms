import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/admin/tenants. Sorted by name. */
export class ListAdminTenantsQueryDto {
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

  @ApiProperty({ required: false, description: 'Searches name and short name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;

  @ApiProperty({ required: false, enum: ['trial', 'active', 'suspended', 'cancelled'] })
  @IsOptional()
  @IsIn(['trial', 'active', 'suspended', 'cancelled'])
  readonly status?: 'trial' | 'active' | 'suspended' | 'cancelled';

  @ApiProperty({ required: false, example: 'growth', description: 'A plan code' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,40}$/)
  readonly plan?: string;
}
