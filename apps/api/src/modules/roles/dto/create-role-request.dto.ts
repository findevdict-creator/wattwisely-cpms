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

/** Body of POST /v1/roles (module 14): a custom role with a chosen set of permissions. */
export class CreateRoleRequestDto {
  @ApiProperty({ example: 'Depot supervisor' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  readonly name!: string;

  @ApiProperty({
    required: false,
    example: 'Runs the depot: commands chargers and keeps the driver list.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly description?: string;

  @ApiProperty({ type: [String], example: ['chargers:read', 'chargers:command'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  readonly permissions!: string[];
}
