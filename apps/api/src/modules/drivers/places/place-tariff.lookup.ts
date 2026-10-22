import { and, desc, eq } from 'drizzle-orm';
import { chargers, sites, tariffs, tariffVersions, Transaction } from '@wattwisely/db';

/** The prices a driver pays at a charger: the site's active tariff and its version in force. */
export interface PlaceTariff {
  name: string;
  currency: string;
  timeZone: string;
  version: typeof tariffVersions.$inferSelect;
}

/** Finds the tariff version a session on this charger would be priced with, as the session opener does. */
export class PlaceTariffLookup {
  async forCharger(tx: Transaction, chargerId: string): Promise<PlaceTariff | null> {
    const rows = await tx
      .select({
        name: tariffs.name,
        currency: tariffs.currency,
        timeZone: sites.timeZone,
        version: tariffVersions,
      })
      .from(chargers)
      .innerJoin(sites, eq(sites.id, chargers.siteId))
      .innerJoin(tariffs, and(eq(tariffs.id, sites.tariffId), eq(tariffs.status, 'active')))
      .innerJoin(tariffVersions, eq(tariffVersions.tariffId, tariffs.id))
      .where(eq(chargers.id, chargerId))
      .orderBy(desc(tariffVersions.number))
      .limit(1);
    return rows[0] ?? null;
  }
}
