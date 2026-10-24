import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of PATCH /v1/roles/{id} (module 14): only the fields sent change; permissions replace the old set. */
export class UpdateRoleRequestDto {
  @ApiProperty({ required: false, example: 'Depot supervisor' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  readonly name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly description?: string;

  @ApiProperty({ required: false, type: [String], description: 'Replaces the permissions' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  readonly permissions?: string[];
}
