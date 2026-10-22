import { and, asc, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { chargers, chargingSessions, connectors, Transaction } from '@wattwisely/db';
import { SessionState } from '../state/session-state';
import { SessionColumns, SessionRow } from './session-row';

/** Totals and bookkeeping written when a session is priced. */
export interface SessionPrice {
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  energyWh: number;
  endedAt: Date;
  pricingEngineVersion: string | null;
  pricingInputHash: string | null;
  reviewFlags: string[];
}

/** The session engine's reads and writes on charging_sessions. */
export class SessionStore {
  static readonly BATCH = 100;

  /** Locks the row for the rest of the transaction, so two workers never price one session twice. */
  async findForUpdate(tx: Transaction, id: string): Promise<SessionRow | null> {
    const rows = await tx
      .select(SessionColumns.SELECT)
      .from(chargingSessions)
      .where(eq(chargingSessions.id, id))
      .for('update', { skipLocked: true });
    return (rows[0] as SessionRow | undefined) ?? null;
  }

  async find(tx: Transaction, id: string): Promise<SessionRow | null> {
    const rows = await tx
      .select(SessionColumns.SELECT)
      .from(chargingSessions)
      .where(eq(chargingSessions.id, id));
    return (rows[0] as SessionRow | undefined) ?? null;
  }

  /** Ids of the tenant's sessions in these states, oldest event first. */
  async idsIn(tx: Transaction, states: SessionState[]): Promise<string[]> {
    const rows = await tx
      .select({ id: chargingSessions.id })
      .from(chargingSessions)
      .where(inArray(chargingSessions.status, states))
      .orderBy(asc(chargingSessions.lastEventAt))
      .limit(SessionStore.BATCH);
    return rows.map((row) => row.id);
  }

  /** Sessions in these states with no news for a day, from chargers that have not been seen either. */
  async silentSince(tx: Transaction, states: SessionState[], since: Date): Promise<string[]> {
    const rows = await tx
      .select({ id: chargingSessions.id })
      .from(chargingSessions)
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .where(
        and(
          inArray(chargingSessions.status, states),
          lt(chargingSessions.lastEventAt, since),
          or(sql`${chargers.lastSeenAt} is null`, lt(chargers.lastSeenAt, since)),
        ),
      )
      .limit(SessionStore.BATCH);
    return rows.map((row) => row.id);
  }

  async maxPowerKw(tx: Transaction, connectorId: string): Promise<number | null> {
    const rows = await tx
      .select({ maxPowerKw: connectors.maxPowerKw })
      .from(connectors)
      .where(and(eq(connectors.id, connectorId), isNotNull(connectors.maxPowerKw)));
    return rows[0]?.maxPowerKw ?? null;
  }

  /** The cost so far of a running session; not a final price, so priced_at stays empty. */
  async saveRunningCost(
    tx: Transaction,
    id: string,
    totals: { netAmount: number; taxAmount: number; grossAmount: number },
  ): Promise<void> {
    await tx.update(chargingSessions).set(totals).where(eq(chargingSessions.id, id));
  }

  async savePrice(tx: Transaction, id: string, price: SessionPrice): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({ ...price, pricedAt: new Date(), updatedAt: new Date() })
      .where(eq(chargingSessions.id, id));
  }

  async saveFailure(tx: Transaction, id: string, failureReason: string): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({ failureReason, updatedAt: new Date() })
      .where(eq(chargingSessions.id, id));
  }
}
