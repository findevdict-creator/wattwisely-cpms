import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of POST /v1/api-keys (module 16): a key with a chosen set of permissions. */
export class CreateApiKeyRequestDto {
  @ApiProperty({ example: 'Fleet sync' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  readonly name!: string;

  @ApiProperty({ required: false, example: 'Reads sessions into the fleet system every night.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly description?: string;

  @ApiProperty({ type: [String], example: ['sessions:read', 'sites:read'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  readonly permissions!: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'When the key stops working; empty for never',
  })
  @IsOptional()
  @IsDateString()
  readonly expires_at?: string | null;
}
