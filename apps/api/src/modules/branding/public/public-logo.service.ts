import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { BrandingErrors } from '../branding-errors';
import { LogoRecord } from '../branding-record';
import { BrandingRepository } from '../branding.repository';

/** Finds a tenant's logo by the tenant's slug, for the public logo endpoint. */
@Injectable()
export class PublicLogoService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: BrandingRepository,
  ) {}

  /** 404 for an unknown slug and for a tenant without a logo, alike. */
  async find(slug: string): Promise<LogoRecord> {
    const tenant = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      this.repository.findTenantBySlug(tx, slug),
    );
    const logo = tenant
      ? await this.runner.run(DatabaseSession.forTenant(tenant.id), (tx) =>
          this.repository.findLogo(tx),
        )
      : null;
    if (!logo) {
      throw BrandingErrors.noLogo();
    }
    return logo;
  }
}
