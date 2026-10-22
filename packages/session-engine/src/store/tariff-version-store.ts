import { and, desc, eq } from 'drizzle-orm';
import { sites, tariffs, tariffVersions, Transaction } from '@wattwisely/db';

export type TariffVersionRow = typeof tariffVersions.$inferSelect;

/** What a new session copies from its site: where it is, its time zone and the prices in force. */
export interface SessionPricingSnapshot {
  siteId: string;
  timeZone: string;
  tariffVersionId: string | null;
  currency: string | null;
}

/** Reads tariff versions for pricing, and the snapshot a session takes when it starts. */
export class TariffVersionStore {
  async find(tx: Transaction, versionId: string): Promise<TariffVersionRow | null> {
    const rows = await tx.select().from(tariffVersions).where(eq(tariffVersions.id, versionId));
    return rows[0] ?? null;
  }

  /** The site's details and the newest version of its tariff, when it has an active one. */
  async snapshotForSite(tx: Transaction, siteId: string): Promise<SessionPricingSnapshot | null> {
    const rows = await tx
      .select({
        siteId: sites.id,
        timeZone: sites.timeZone,
        tariffVersionId: tariffVersions.id,
        currency: tariffs.currency,
      })
      .from(sites)
      .leftJoin(tariffs, and(eq(tariffs.id, sites.tariffId), eq(tariffs.status, 'active')))
      .leftJoin(tariffVersions, eq(tariffVersions.tariffId, tariffs.id))
      .where(eq(sites.id, siteId))
      .orderBy(desc(tariffVersions.number))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { ...row, currency: row.tariffVersionId ? row.currency : null };
  }
}
