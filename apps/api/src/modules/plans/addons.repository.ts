import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { addons, Transaction } from '@wattwisely/db';
import { AddonRecord } from './plan-record';

/** Reads and writes add-on prices. The add-ons themselves are declared in ModuleCatalog. */
@Injectable()
export class AddonsRepository {
  async findAll(tx: Transaction): Promise<AddonRecord[]> {
    return tx.select().from(addons).orderBy(asc(addons.sortOrder), asc(addons.key));
  }

  async findByKey(tx: Transaction, key: string): Promise<AddonRecord | null> {
    const rows = await tx.select().from(addons).where(eq(addons.key, key));
    return rows[0] ?? null;
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof addons.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(addons)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(addons.id, id), eq(addons.version, version)))
      .returning({ id: addons.id });
    return rows.length === 1;
  }
}
