import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
