import { ApiProperty } from '@nestjs/swagger';
import { TenantBrand } from '@wattwisely/mail';
import { PlatformColours } from '@wattwisely/theme';
import { BrandingRecord } from '../branding-record';
import { PublicBrandingDto } from './public-branding.dto';

/**
 * GET /v1/branding: what the company saved (null where it left the default) and, as
 * `preview`, what drivers see as a result. `version` goes back as If-Match on every change.
 */
export class BrandingDto {
  @ApiProperty({ nullable: true, example: 'Acme Go', description: 'Null: the company’s name' })
  readonly display_name: string | null;

  @ApiProperty({
    nullable: true,
    example: PlatformColours.PRIMARY,
    description: 'Null: the platform’s colour',
  })
  readonly primary_color: string | null;

  @ApiProperty({ nullable: true, example: PlatformColours.ACCENT })
  readonly accent_color: string | null;

  @ApiProperty({ nullable: true })
  readonly support_email: string | null;

  @ApiProperty({ nullable: true })
  readonly support_phone: string | null;

  @ApiProperty({ nullable: true })
  readonly support_url: string | null;

  @ApiProperty({ nullable: true, example: 'image/png' })
  readonly logo_content_type: string | null;

  @ApiProperty({ nullable: true })
  readonly logo_size_bytes: number | null;

  @ApiProperty({ nullable: true, description: 'Where the logo is served, once uploaded' })
  readonly logo_url: string | null;

  @ApiProperty({ type: PublicBrandingDto, description: 'What drivers see with these settings' })
  readonly preview: PublicBrandingDto;

  @ApiProperty({ nullable: true })
  readonly updated_at: string | null;

  @ApiProperty({ description: 'Send as If-Match when changing anything; 1 before the first save' })
  readonly version: number;

  constructor(record: BrandingRecord | null, brand: TenantBrand) {
    const saved = record ?? BrandingDto.UNSAVED;
    this.display_name = saved.displayName;
    this.primary_color = saved.primaryColor;
    this.accent_color = saved.accentColor;
    this.support_email = saved.supportEmail;
    this.support_phone = saved.supportPhone;
    this.support_url = saved.supportUrl;
    this.logo_content_type = saved.logoContentType;
    this.logo_size_bytes = saved.logoSizeBytes;
    this.logo_url = brand.logoUrl;
    this.preview = new PublicBrandingDto(brand);
    this.updated_at = saved.updatedAt ? saved.updatedAt.toISOString() : null;
    this.version = saved.version;
  }

  /** The version of the defaults: the first save moves the row past it, so two first saves cannot cross. */
  static readonly UNSAVED_VERSION = 1;

  /** What a company that never saved anything has. */
  static readonly UNSAVED = {
    displayName: null,
    primaryColor: null,
    accentColor: null,
    supportEmail: null,
    supportPhone: null,
    supportUrl: null,
    logoContentType: null,
    logoSizeBytes: null,
    updatedAt: null as Date | null,
    version: BrandingDto.UNSAVED_VERSION,
  };
}
