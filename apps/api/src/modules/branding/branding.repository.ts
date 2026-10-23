import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { tenantBranding, tenants, Transaction } from '@wattwisely/db';
import { BrandingRecord, BrandTenant, LogoRecord } from './branding-record';

/**
 * Reads and writes tenant_branding. Row-level security shows the current tenant's row
 * only, so the reads take no tenant id; the tenants table is global and is read by id or slug.
 */
@Injectable()
export class BrandingRepository {
  /** The columns of a branding row that every read wants: everything but the logo's bytes. */
  static readonly SETTINGS_COLUMNS = {
    id: tenantBranding.id,
    tenantId: tenantBranding.tenantId,
    displayName: tenantBranding.displayName,
    primaryColor: tenantBranding.primaryColor,
    accentColor: tenantBranding.accentColor,
    supportEmail: tenantBranding.supportEmail,
    supportPhone: tenantBranding.supportPhone,
    supportUrl: tenantBranding.supportUrl,
    logoContentType: tenantBranding.logoContentType,
    logoEtag: tenantBranding.logoEtag,
    logoSizeBytes: tenantBranding.logoSizeBytes,
    updatedBy: tenantBranding.updatedBy,
    version: tenantBranding.version,
    createdAt: tenantBranding.createdAt,
    updatedAt: tenantBranding.updatedAt,
  };

  /** The current tenant's settings, or null when nothing was ever saved. */
  async findSettings(tx: Transaction): Promise<BrandingRecord | null> {
    const rows = await tx.select(BrandingRepository.SETTINGS_COLUMNS).from(tenantBranding);
    return rows[0] ?? null;
  }

  /** The current tenant's logo bytes, or null without a logo. */
  async findLogo(tx: Transaction): Promise<LogoRecord | null> {
    const rows = await tx
      .select({
        contentType: tenantBranding.logoContentType,
        etag: tenantBranding.logoEtag,
        data: tenantBranding.logoData,
      })
      .from(tenantBranding)
      .where(and(isNotNull(tenantBranding.logoData), isNotNull(tenantBranding.logoEtag)));
    const row = rows[0];
    return row?.data && row.contentType && row.etag
      ? { contentType: row.contentType, etag: row.etag, data: row.data }
      : null;
  }

  async findTenant(tx: Transaction, tenantId: string): Promise<BrandTenant | null> {
    const rows = await tx
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    return rows[0] ?? null;
  }

  async findTenantBySlug(tx: Transaction, slug: string): Promise<BrandTenant | null> {
    const rows = await tx
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.slug, slug));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof tenantBranding.$inferInsert): Promise<void> {
    await tx.insert(tenantBranding).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof tenantBranding.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(tenantBranding)
      .set({ ...changes, version: version + 1 })
      .where(and(eq(tenantBranding.id, id), eq(tenantBranding.version, version)))
      .returning({ id: tenantBranding.id });
    return rows.length === 1;
  }
}
