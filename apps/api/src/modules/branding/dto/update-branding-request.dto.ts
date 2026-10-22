import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

/**
 * Body of PATCH /v1/branding: only the fields sent change; null (or an empty string) puts
 * a field back to its default. Needs the If-Match header.
 */
export class UpdateBrandingRequestDto {
  @ApiProperty({ required: false, nullable: true, example: 'Acme Go' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  readonly display_name?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '#1b5e20' })
  @IsOptional()
  @IsString()
  @Matches(/^#?[0-9a-fA-F]{6}$/, { message: 'primary_color must be six hex digits, e.g. #1b5e20' })
  readonly primary_color?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '#43a047' })
  @IsOptional()
  @IsString()
  @Matches(/^#?[0-9a-fA-F]{6}$/, { message: 'accent_color must be six hex digits, e.g. #43a047' })
  readonly accent_color?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'help@acme.example' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly support_email?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '+44 20 7946 0000' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s().-]{4,29}$/, { message: 'support_phone must be a phone number' })
  readonly support_phone?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'https://acme.example/help' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  readonly support_url?: string | null;
}
