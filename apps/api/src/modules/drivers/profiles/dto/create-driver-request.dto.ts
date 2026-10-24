import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of POST /v1/drivers (story DRV-01). Only the name is required. */
export class CreateDriverRequestDto {
  @ApiProperty({ example: 'Dana Driver' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'dana@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '+44 7700 900123' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly phone?: string | null;

  @ApiProperty({ required: false, example: 'EMP-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly notes?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'The access groups to put the driver in',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  readonly group_ids?: string[];
}
