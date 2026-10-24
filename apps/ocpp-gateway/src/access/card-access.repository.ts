import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  accessGroupMembers,
  accessGroupSites,
  chargers,
  drivers,
  rfidCards,
  sites,
  Transaction,
} from '@wattwisely/db';
import { CardAccess } from './card-access';

/** Looks an idTag up as an RFID card of the charger's tenant, with what decides its verdict. */
@Injectable()
export class CardAccessRepository {
  /** Runs inside the charger's tenant, so only that tenant's cards are visible. */
  async findByTag(tx: Transaction, chargerId: string, idTag: string): Promise<CardAccess | null> {
    const rows = await tx
      .select({
        cardId: rfidCards.id,
        driverId: rfidCards.driverId,
        cardStatus: rfidCards.status,
        expiresAt: rfidCards.expiresAt,
        driverStatus: drivers.status,
        isDriverDeleted: sql<boolean>`${drivers.deletedAt} is not null`,
        visibility: sql<
          'public' | 'private'
        >`coalesce(${chargers.visibilityOverride}, ${sites.visibility})`,
        isMemberAtSite: sql<boolean>`exists (${CardAccessRepository.membership(tx)})`,
      })
      .from(rfidCards)
      .innerJoin(drivers, eq(drivers.id, rfidCards.driverId))
      .innerJoin(chargers, eq(chargers.id, chargerId))
      .innerJoin(sites, eq(sites.id, chargers.siteId))
      .where(eq(sql`lower(${rfidCards.idTag})`, idTag.toLowerCase()));
    return rows[0] ?? null;
  }

  /** Is the card's driver in a group that names the charger's site? Correlated with the outer rows. */
  private static membership(tx: Transaction) {
    return tx
      .select({ one: sql`1` })
      .from(accessGroupMembers)
      .innerJoin(accessGroupSites, eq(accessGroupSites.groupId, accessGroupMembers.groupId))
      .where(
        and(
          eq(accessGroupMembers.driverId, drivers.id),
          eq(accessGroupSites.siteId, chargers.siteId),
        ),
      );
  }

  async markUsed(tx: Transaction, cardId: string): Promise<void> {
    await tx
      .update(rfidCards)
      .set({ lastUsedAt: sql`now()` })
      .where(eq(rfidCards.id, cardId));
  }
}
