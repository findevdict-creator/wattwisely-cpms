import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { BrandingRepository } from './branding.repository';
import { LogoUrlBuilder } from './logo-url.builder';
import { TenantBrand } from './tenant-brand';

/**
 * The brand of a tenant, for everything that shows one: the driver's pages, e-mails and
 * receipts. Other modules import this through BrandingModule.
 */
@Injectable()
export class TenantBrandLookup {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: BrandingRepository,
    private readonly logoUrls: LogoUrlBuilder,
  ) {}

  /** Inside a transaction that already works in the tenant (DatabaseSession.forTenant). */
  async current(tx: Transaction, tenantId: string): Promise<TenantBrand> {
    const tenant = await this.repository.findTenant(tx, tenantId);
    const settings = await this.repository.findSettings(tx);
    const logoUrl =
      tenant && settings?.logoEtag ? this.logoUrls.for(tenant.slug, settings.logoEtag) : null;
    return TenantBrand.of(tenant?.name ?? '', settings, logoUrl);
  }

  /** In a transaction of its own, for callers outside one (e.g. sending an e-mail). */
  async load(tenantId: string): Promise<TenantBrand> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), (tx) => this.current(tx, tenantId));
  }
}
