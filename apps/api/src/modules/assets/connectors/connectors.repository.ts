import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { chargingSessions, connectors, Transaction } from '@wattwisely/db';
import { ActiveSession, ConnectorRecord } from './connector-record';

/** Reads and writes the connectors table. RLS limits every query to the current tenant. */
@Injectable()
export class ConnectorsRepository {
  static readonly COLUMNS = {
    id: connectors.id,
    chargerId: connectors.chargerId,
    ocppConnectorId: connectors.ocppConnectorId,
    evseId: connectors.evseId,
    type: connectors.type,
    currentType: connectors.currentType,
    maxPowerKw: connectors.maxPowerKw,
    label: connectors.label,
    status: connectors.status,
    errorCode: connectors.errorCode,
    statusInfo: connectors.statusInfo,
    statusChangedAt: connectors.statusChangedAt,
    version: connectors.version,
    activeSession: sql<ActiveSession | null>`(select json_build_object(
        'id', s.id, 'ocppTransactionId', s.ocpp_transaction_id, 'status', s.status,
        'startedAt', s.started_at, 'energyWh', s.energy_wh,
        'grossAmount', s.gross_amount, 'currency', s.currency)
      from ${chargingSessions} s
      where s.connector_id = ${connectors.id}
        and s.status in ('charging', 'suspended', 'idle', 'stopping')
      order by s.started_at desc limit 1)`,
  };

  /** The connectors of these chargers, in OCPP connector order. */
  async findByChargers(tx: Transaction, chargerIds: string[]): Promise<ConnectorRecord[]> {
    if (chargerIds.length === 0) {
      return [];
    }
    return tx
      .select(ConnectorsRepository.COLUMNS)
      .from(connectors)
      .where(inArray(connectors.chargerId, chargerIds))
      .orderBy(asc(connectors.ocppConnectorId));
  }

  async findById(tx: Transaction, id: string): Promise<ConnectorRecord | null> {
    const rows = await tx
      .select(ConnectorsRepository.COLUMNS)
      .from(connectors)
      .where(eq(connectors.id, id));
    return rows[0] ?? null;
  }

  /** The next free OCPP connector number on a charger: one more than the highest so far. */
  async nextOcppConnectorId(tx: Transaction, chargerId: string): Promise<number> {
    const rows = await tx
      .select({ highest: max(connectors.ocppConnectorId) })
      .from(connectors)
      .where(eq(connectors.chargerId, chargerId));
    return (rows[0]?.highest ?? 0) + 1;
  }

  async insert(tx: Transaction, row: typeof connectors.$inferInsert): Promise<void> {
    await tx.insert(connectors).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof connectors.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(connectors)
      .set({ ...changes, version: version + 1 })
      .where(and(eq(connectors.id, id), eq(connectors.version, version)))
      .returning({ id: connectors.id });
    return rows.length === 1;
  }

  async delete(tx: Transaction, id: string): Promise<void> {
    await tx.delete(connectors).where(eq(connectors.id, id));
  }
}
