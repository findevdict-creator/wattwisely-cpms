import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { chargingSessions, Transaction, UuidV7 } from '@wattwisely/db';
import {
  SessionColumns,
  SessionPricingSnapshot,
  SessionRow,
  SessionState,
  SessionStates,
} from '@wattwisely/session-engine';

/** What StartTransaction records. */
export interface SessionStart {
  tenantId: string;
  chargerId: string;
  connectorId: string;
  idTag: string;
  /** The driver and card behind the tag, when it was a registered RFID card (module 13). */
  driverId?: string | null;
  rfidCardId?: string | null;
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

/** The gateway's reads and writes on charging_sessions. State changes go through SessionTransitions. */
@Injectable()
export class SessionsRepository {
  /** States in which the charger may still report on the session. */
  static readonly UNFINISHED: SessionState[] = [...SessionStates.ACTIVE, 'stopping'];

  /** Opens the session with the next OCPP transaction id, the site's tariff version and time zone. */
  async start(
    tx: Transaction,
    start: SessionStart,
    snapshot: SessionPricingSnapshot,
  ): Promise<SessionRow> {
    const rows = await tx
      .insert(chargingSessions)
      .values({
        id: UuidV7.create(),
        ...start,
        ...snapshot,
        status: 'charging',
        energyIncreasedAt: start.startedAt,
        ocppTransactionId: sql`nextval('ocpp_transaction_id_seq')`,
      })
      .returning(SessionColumns.SELECT);
    return rows[0] as SessionRow;
  }

  /**
   * The paid session waiting for this start (module 6): the one the remote start command
   * belongs to, or else the newest one waiting on the connector (the gateway may have
   * restarted and forgotten which tag it issued).
   */
  async findWaiting(
    tx: Transaction,
    connectorId: string,
    commandId: string | null,
  ): Promise<SessionRow | null> {
    const rows = await tx
      .select(SessionColumns.SELECT)
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.status, 'starting'),
          or(
            eq(chargingSessions.connectorId, connectorId),
            commandId ? eq(chargingSessions.commandId, commandId) : sql`false`,
          ),
        ),
      )
      .orderBy(
        desc(sql`${chargingSessions.commandId} = ${commandId ?? sql`null`}::uuid`),
        desc(chargingSessions.startedAt),
      )
      .limit(1);
    return (rows[0] as SessionRow | undefined) ?? null;
  }

  /** The charger started a session that was waiting for it: it gets its transaction id and start reading now. */
  async adopt(tx: Transaction, session: SessionRow, start: SessionStart): Promise<SessionRow> {
    const rows = await tx
      .update(chargingSessions)
      .set({
        ocppTransactionId: sql`nextval('ocpp_transaction_id_seq')`,
        connectorId: start.connectorId,
        idTag: start.idTag,
        startedAt: start.startedAt,
        meterStartWh: start.meterStartWh,
        energyIncreasedAt: start.startedAt,
        lastEventAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chargingSessions.id, session.id))
      .returning(SessionColumns.SELECT);
    return rows[0] as SessionRow;
  }

  async findByTransactionId(tx: Transaction, chargerId: string, ocppTransactionId: number) {
    const rows = await tx
      .select(SessionColumns.SELECT)
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.chargerId, chargerId),
          eq(chargingSessions.ocppTransactionId, ocppTransactionId),
        ),
      );
    return (rows[0] as SessionRow | undefined) ?? null;
  }

  /** The newest session on the connector in one of these states. */
  async findOnConnector(
    tx: Transaction,
    connectorId: string,
    states: SessionState[] = SessionStates.ACTIVE,
  ): Promise<SessionRow | null> {
    const rows = await tx
      .select(SessionColumns.SELECT)
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.connectorId, connectorId),
          inArray(chargingSessions.status, states),
        ),
      )
      .orderBy(desc(chargingSessions.startedAt))
      .limit(1);
    return (rows[0] as SessionRow | undefined) ?? null;
  }

  async stop(tx: Transaction, session: SessionRow, stop: SessionStop): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({
        endedAt: stop.endedAt,
        meterStopWh: stop.meterStopWh,
        energyWh: Math.max(0, stop.meterStopWh - (session.meterStartWh ?? 0)),
        stopReason: stop.stopReason,
        lastEventAt: new Date(),
      })
      .where(eq(chargingSessions.id, session.id));
  }

  /** A new reading moves the running total, never backwards, and notes when it last went up. */
  async updateEnergy(
    tx: Transaction,
    session: SessionRow,
    reading: { meterWh: number; at: Date },
  ): Promise<number> {
    const energyWh = Math.max(session.energyWh, reading.meterWh - (session.meterStartWh ?? 0));
    const isIncreased = energyWh > session.energyWh;
    await tx
      .update(chargingSessions)
      .set({
        energyWh,
        lastEventAt: new Date(),
        ...(isIncreased ? { energyIncreasedAt: reading.at } : {}),
      })
      .where(eq(chargingSessions.id, session.id));
    return energyWh;
  }

  /** The car left: the idle time ends here. The first unplug counts; a repeated one changes nothing. */
  async markUnplugged(tx: Transaction, sessionId: string, at: Date): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({ unpluggedAt: at, lastEventAt: new Date() })
      .where(and(eq(chargingSessions.id, sessionId), isNull(chargingSessions.unpluggedAt)));
  }

  async touch(tx: Transaction, sessionId: string): Promise<void> {
    await tx
      .update(chargingSessions)
      .set({ lastEventAt: new Date() })
      .where(eq(chargingSessions.id, sessionId));
  }
}
