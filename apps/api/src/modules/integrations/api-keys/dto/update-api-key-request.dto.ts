import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Body of PATCH /v1/api-keys/{id}: the name and description. Permissions and expiry are fixed; make a new key. */
export class UpdateApiKeyRequestDto {
  @ApiProperty({ required: false })
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
}
