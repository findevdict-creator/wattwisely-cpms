import { eq } from 'drizzle-orm';
import { chargers, SiteAddress, sites, tenants, Transaction } from '@wattwisely/db';

/** Where a charger stands and who runs it, as the QR page introduces the place. */
export interface PlaceSite {
  operatorName: string;
  siteName: string;
  address: SiteAddress;
  timeZone: string;
}

/** The site and operator behind a charger. */
export class PlaceSiteLookup {
  async forCharger(tx: Transaction, chargerId: string): Promise<PlaceSite | null> {
    const rows = await tx
      .select({
        operatorName: tenants.name,
        siteName: sites.name,
        address: sites.address,
        timeZone: sites.timeZone,
      })
      .from(chargers)
      .innerJoin(sites, eq(sites.id, chargers.siteId))
      .innerJoin(tenants, eq(tenants.id, chargers.tenantId))
      .where(eq(chargers.id, chargerId));
    return rows[0] ?? null;
  }
}
