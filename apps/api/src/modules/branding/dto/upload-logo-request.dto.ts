import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsIn, MaxLength } from 'class-validator';
import { LogoPolicy } from '../logo-policy';

/** Body of PUT /v1/branding/logo: the image, base64-encoded. Needs the If-Match header. */
export class UploadLogoRequestDto {
  @ApiProperty({ enum: LogoPolicy.CONTENT_TYPES, example: 'image/png' })
  @IsIn(LogoPolicy.CONTENT_TYPES)
  readonly content_type!: string;

  @ApiProperty({ description: 'The file, base64 (standard alphabet); at most 512 KB decoded' })
  @IsBase64()
  @MaxLength(Math.ceil((LogoPolicy.MAX_BYTES * 4) / 3) + 4)
  readonly data!: string;
}
