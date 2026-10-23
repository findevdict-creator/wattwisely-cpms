import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/refunds: the approval queue and recent refunds. */
export class ListRefundsQueryDto {
  @ApiProperty({ required: false, default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  readonly limit?: number;

  @ApiProperty({ required: false, description: 'Comma list, e.g. awaiting_approval' })
  @IsOptional()
  @Matches(/^[a-z_]+(,[a-z_]+)*$/, { message: 'status must be a comma list of statuses' })
  @MaxLength(200)
  readonly status?: string;
}
