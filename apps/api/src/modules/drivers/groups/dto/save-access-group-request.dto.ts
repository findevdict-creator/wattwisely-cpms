import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Body of POST /v1/access-groups and PATCH /v1/access-groups/{id} (story AST-04). On a
 * PATCH only the fields sent change; a list sent replaces the sites or the drivers as a whole.
 */
export class SaveAccessGroupRequestDto {
  @ApiProperty({ required: false, example: 'Depot staff' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;

  @ApiProperty({
    required: false,
    enum: ['inherit', 'pay', 'free'],
    description: 'Whether the sessions of the group’s drivers are paid (module 19)',
  })
  @IsOptional()
  @IsIn(['inherit', 'pay', 'free'])
  readonly payment_mode?: 'inherit' | 'pay' | 'free';

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'The hold on a member’s saved card in minor units; null uses your member hold amount',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  readonly hold_amount?: number | null;

  @ApiProperty({ required: false, type: [String], description: 'The sites the group opens' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  readonly site_ids?: string[];

  @ApiProperty({ required: false, type: [String], description: 'The drivers in the group' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  readonly driver_ids?: string[];
}
