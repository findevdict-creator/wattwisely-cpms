import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantBranding, tenants, Transaction } from '@wattwisely/db';
import { LogoUrl, TenantBrand } from '@wattwisely/mail';
import { WorkerConfig } from '../config/worker.config';

/** A tenant's brand for the e-mails the worker sends, read like the API's TenantBrandLookup. */
@Injectable()
export class BrandReader {
  constructor(private readonly config: WorkerConfig) {}

  /** Inside a transaction that works in the tenant. */
  async current(tx: Transaction, tenantId: string): Promise<TenantBrand> {
    const [tenant] = await tx
      .select({ name: tenants.name, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    const [settings] = await tx
      .select({
        displayName: tenantBranding.displayName,
        primaryColor: tenantBranding.primaryColor,
        accentColor: tenantBranding.accentColor,
        supportEmail: tenantBranding.supportEmail,
        supportPhone: tenantBranding.supportPhone,
        supportUrl: tenantBranding.supportUrl,
        logoEtag: tenantBranding.logoEtag,
      })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId));
    const logoUrl =
      tenant && settings?.logoEtag
        ? LogoUrl.of(this.config.apiUrl, tenant.slug, settings.logoEtag)
        : null;
    return TenantBrand.of(tenant?.name ?? '', settings ?? null, logoUrl);
  }
}
