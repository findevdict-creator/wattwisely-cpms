import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { chargingSessions, Transaction, UuidV7 } from '@wattwisely/db';

/** A charging_sessions row as the gateway works with it. */
export interface SessionRecord {
  id: string;
  connectorId: string;
  ocppTransactionId: number;
  status: 'charging' | 'ended';
  idTag: string;
  startedAt: Date;
  meterStartWh: number;
  energyWh: number;
}

/** What StartTransaction records. */
export interface SessionStart {
  tenantId: string;
  chargerId: string;
  connectorId: string;
  idTag: string;
  startedAt: Date;
  meterStartWh: number;
  commandId: string | null;
}

/** What StopTransaction records. */
export interface SessionStop {
  endedAt: Date;
  meterStopWh: number;
  stopReason: string | null;
}

/** The gateway's reads and writes on charging_sessions. */
@Injectable()
export class SessionsRepository {
  static readonly COLUMNS = {
    id: chargingSessions.id,
    connectorId: chargingSessions.connectorId,
    ocppTransactionId: chargingSessions.ocppTransactionId,
    status: chargingSessions.status,
    idTag: chargingSessions.idTag,
    startedAt: chargingSessions.startedAt,
    meterStartWh: chargingSessions.meterStartWh,
    energyWh: chargingSessions.energyWh,
  };

  /** Opens the session with the next OCPP transaction id from the platform-wide sequence. */
  async start(tx: Transaction, start: SessionStart): Promise<SessionRecord> {
    const rows = await tx
      .insert(chargingSessions)
      .values({
        id: UuidV7.create(),
        ...start,
        ocppTransactionId: sql`nextval('ocpp_transaction_id_seq')`,
      })
      .returning(SessionsRepository.COLUMNS);
    return rows[0] as SessionRecord;
  }

  async findByTransactionId(tx: Transaction, chargerId: string, ocppTransactionId: number) {
    const rows = await tx
      .select(SessionsRepository.COLUMNS)
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.chargerId, chargerId),
          eq(chargingSessions.ocppTransactionId, ocppTransactionId),
        ),
      );
    return (rows[0] as SessionRecord | undefined) ?? null;
  }

  async findActiveOnConnector(tx: Transaction, connectorId: string): Promise<SessionRecord | null> {
    const rows = await tx
      .select(SessionsRepository.COLUMNS)
      .from(chargingSessions)
      .where(
        and(eq(chargingSessions.connectorId, connectorId), eq(chargingSessions.status, 'charging')),
      )
      .orderBy(desc(chargingSessions.startedAt))
      .limit(1);
    return (rows[0] as SessionRecord | undefined) ?? null;
  }

  async stop(tx: Transaction, session: SessionRecord, stop: SessionStop): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({
        status: 'ended',
        endedAt: stop.endedAt,
        meterStopWh: stop.meterStopWh,
        energyWh: Math.max(0, stop.meterStopWh - session.meterStartWh),
        stopReason: stop.stopReason,
      })
      .where(eq(chargingSessions.id, session.id));
  }

  /** A new reading moves the running total, never backwards. */
  async updateEnergy(tx: Transaction, session: SessionRecord, meterWh: number): Promise<number> {
    const energyWh = Math.max(session.energyWh, meterWh - session.meterStartWh);
    await tx
      .update(chargingSessions)
      .set({ energyWh })
      .where(and(eq(chargingSessions.id, session.id), eq(chargingSessions.status, 'charging')));
    return energyWh;
  }
}
