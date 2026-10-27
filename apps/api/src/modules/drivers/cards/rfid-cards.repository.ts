import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { rfidCards, Transaction } from '@wattwisely/db';
import { RfidCardRecord } from './rfid-card-record';

/** Reads and writes RFID cards. RLS keeps every query inside the current tenant. */
@Injectable()
export class RfidCardsRepository {
  static readonly COLUMNS = {
    id: rfidCards.id,
    driverId: rfidCards.driverId,
    idTag: rfidCards.idTag,
    label: rfidCards.label,
    status: rfidCards.status,
    paymentMode: rfidCards.paymentMode,
    expiresAt: rfidCards.expiresAt,
    lastUsedAt: rfidCards.lastUsedAt,
    version: rfidCards.version,
    createdAt: rfidCards.createdAt,
    updatedAt: rfidCards.updatedAt,
  };

  /** A driver's cards, oldest first. */
  async findByDriver(tx: Transaction, driverId: string): Promise<RfidCardRecord[]> {
    return tx
      .select(RfidCardsRepository.COLUMNS)
      .from(rfidCards)
      .where(eq(rfidCards.driverId, driverId))
      .orderBy(asc(rfidCards.createdAt), asc(rfidCards.id));
  }

  async findById(tx: Transaction, id: string): Promise<RfidCardRecord | null> {
    const rows = await tx
      .select(RfidCardsRepository.COLUMNS)
      .from(rfidCards)
      .where(eq(rfidCards.id, id));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof rfidCards.$inferInsert): Promise<void> {
    await tx.insert(rfidCards).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof rfidCards.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(rfidCards)
      .set({ ...changes, version: sql`${rfidCards.version} + 1`, updatedAt: new Date() })
      .where(and(eq(rfidCards.id, id), eq(rfidCards.version, version)))
      .returning({ id: rfidCards.id });
    return rows.length === 1;
  }

  /** When a driver is deleted, every card of theirs that still worked stops working. */
  async blockAllOf(tx: Transaction, driverId: string): Promise<number> {
    const rows = await tx
      .update(rfidCards)
      .set({ status: 'blocked', version: sql`${rfidCards.version} + 1`, updatedAt: new Date() })
      .where(and(eq(rfidCards.driverId, driverId), eq(rfidCards.status, 'active')))
      .returning({ id: rfidCards.id });
    return rows.length;
  }
}
