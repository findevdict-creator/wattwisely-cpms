import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Query of GET /v1/audit-log (API Design, Audit log). Newest entries first. */
export class ListAuditLogQueryDto {
  static readonly ACTOR_TYPES = [
    'user',
    'api_key',
    'support',
    'system',
    'platform',
    'managed',
  ] as const;

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

  @ApiProperty({
    required: false,
    description: 'Comma list, e.g. team.member_invited,team.member_removed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly action?: string;

  @ApiProperty({ required: false, enum: ListAuditLogQueryDto.ACTOR_TYPES })
  @IsOptional()
  @IsIn(ListAuditLogQueryDto.ACTOR_TYPES)
  readonly actor_type?: (typeof ListAuditLogQueryDto.ACTOR_TYPES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly actor_id?: string;

  @ApiProperty({ required: false, example: 'member' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly target_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly target_id?: string;

  @ApiProperty({ required: false, description: 'Inclusive' })
  @IsOptional()
  @IsDateString()
  readonly occurred_at_from?: string;

  @ApiProperty({ required: false, description: 'Exclusive' })
  @IsOptional()
  @IsDateString()
  readonly occurred_at_to?: string;
}
