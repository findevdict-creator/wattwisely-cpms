import { tenantBranding } from '@wattwisely/db';

/** A tenant's saved branding, without the logo's bytes (read separately, only when served). */
export type BrandingRecord = Omit<typeof tenantBranding.$inferSelect, 'logoData'>;

/** The logo as the public endpoint serves it. */
export interface LogoRecord {
  contentType: string;
  etag: string;
  data: Buffer;
}

/** The global tenant row a brand belongs to. */
export interface BrandTenant {
  id: string;
  slug: string;
  name: string;
}
