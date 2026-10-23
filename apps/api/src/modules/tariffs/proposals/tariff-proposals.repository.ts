import { Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { tariffProposals, Transaction, userAccounts } from '@wattwisely/db';
import { TariffProposalRecord, TariffProposalRow } from './tariff-proposal-record';

/** Reads and writes tariff proposals. RLS limits every query to the current tenant. */
@Injectable()
export class TariffProposalsRepository {
  static readonly LIMIT = 100;

  private readonly decider = alias(userAccounts, 'decider');

  /** Newest first; proposals are few, so the list is not paged. */
  async findAll(
    tx: Transaction,
    status?: TariffProposalRow['status'],
  ): Promise<TariffProposalRecord[]> {
    return this.select(tx)
      .where(status ? eq(tariffProposals.status, status) : undefined)
      .orderBy(desc(tariffProposals.proposedAt), desc(tariffProposals.id))
      .limit(TariffProposalsRepository.LIMIT);
  }

  async findById(tx: Transaction, id: string): Promise<TariffProposalRecord | null> {
    const rows = await this.select(tx).where(eq(tariffProposals.id, id));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof tariffProposals.$inferInsert): Promise<void> {
    await tx.insert(tariffProposals).values(row);
  }

  /** Applies the change only when the row still has the version the caller saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<TariffProposalRow>,
  ): Promise<boolean> {
    const rows = await tx
      .update(tariffProposals)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(tariffProposals.id, id), eq(tariffProposals.version, version)))
      .returning({ id: tariffProposals.id });
    return rows.length === 1;
  }

  private select(tx: Transaction) {
    return tx
      .select({
        ...getTableColumns(tariffProposals),
        proposedByLabel: sql<string>`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
        decidedByLabel: sql<
          string | null
        >`coalesce(nullif(${this.decider.name}, ''), ${this.decider.email})`,
      })
      .from(tariffProposals)
      .innerJoin(userAccounts, eq(userAccounts.id, tariffProposals.proposedBy))
      .leftJoin(this.decider, eq(this.decider.id, tariffProposals.decidedBy));
  }
}
