import { ApiProperty } from '@nestjs/swagger';
import { TenantBrand } from '@wattwisely/mail';

/**
 * A tenant's brand as the driver's pages paint it: the name, the colours, where the logo
 * is, and how to reach the operator. Public: it is on every sticker and price sign anyway.
 */
export class PublicBrandingDto {
  @ApiProperty({ example: 'Acme Charging', description: 'The name drivers see' })
  readonly name: string;

  @ApiProperty({
    nullable: true,
    example: 'https://api.example.com/v1/public/branding/acme/logo?v=…',
  })
  readonly logo_url: string | null;

  @ApiProperty({ example: '#1b5e20', description: 'Top bar and buttons' })
  readonly primary_color: string;

  @ApiProperty({ example: '#ffffff', description: 'Text that reads on the primary colour' })
  readonly on_primary_color: string;

  @ApiProperty({ example: '#43a047', description: 'Highlights and links' })
  readonly accent_color: string;

  @ApiProperty({ nullable: true, example: 'help@acme.example' })
  readonly support_email: string | null;

  @ApiProperty({ nullable: true, example: '+44 20 7946 0000' })
  readonly support_phone: string | null;

  @ApiProperty({ nullable: true, example: 'https://acme.example/help' })
  readonly support_url: string | null;

  @ApiProperty({ example: 'Wattwisely', description: 'For the "Powered by" line' })
  readonly platform_name: string;

  constructor(brand: TenantBrand) {
    this.name = brand.name;
    this.logo_url = brand.logoUrl;
    this.primary_color = brand.primaryColor;
    this.on_primary_color = brand.onPrimaryColor;
    this.accent_color = brand.accentColor;
    this.support_email = brand.supportEmail;
    this.support_phone = brand.supportPhone;
    this.support_url = brand.supportUrl;
    this.platform_name = TenantBrand.PLATFORM_NAME;
  }
}
