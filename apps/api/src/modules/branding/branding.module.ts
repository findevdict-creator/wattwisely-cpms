import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { BrandingRepository } from './branding.repository';
import { BrandingSaver } from './branding.saver';
import { BrandingService } from './branding.service';
import { LogoService } from './logo.service';
import { LogoUrlBuilder } from './logo-url.builder';
import { PublicLogoController } from './public/public-logo.controller';
import { PublicLogoService } from './public/public-logo.service';
import { TenantBrandLookup } from './tenant-brand.lookup';

/**
 * Tenant branding (module 8): the settings screen's API, the public logo, and the brand
 * lookup every other module uses to show a tenant the way it wants to be seen (the
 * driver's pages, e-mails, receipts).
 */
@Module({
  controllers: [BrandingController, PublicLogoController],
  providers: [
    BrandingRepository,
    BrandingSaver,
    BrandingService,
    LogoService,
    LogoUrlBuilder,
    PublicLogoService,
    TenantBrandLookup,
  ],
  exports: [TenantBrandLookup],
})
export class BrandingModule {}
