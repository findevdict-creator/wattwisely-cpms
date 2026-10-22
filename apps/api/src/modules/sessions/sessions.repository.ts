import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import {
  chargers,
  chargingSessions,
  connectors,
  meterValues,
  sessionLineItems,
  sessionStateChanges,
  sites,
  tariffs,
  tariffVersions,
  Transaction,
} from '@wattwisely/db';
import { ListCursor } from '../../common/paging/list-cursor';
import { ReceiptLine } from '../tariffs/dto/receipt-line.dto';
import { SessionConditions, SessionFilter } from './session-filter';
import {
  SessionReading,
  SessionRecord,
  SessionStateChangeRecord,
  SessionTariff,
} from './session-record';

/** Reads charging sessions for the API. RLS limits every query to the current tenant. */
@Injectable()
export class SessionsRepository {
  static readonly MAX_READINGS = 5000;
  static readonly COLUMNS = {
    id: chargingSessions.id,
    status: chargingSessions.status,
    siteId: chargingSessions.siteId,
    siteName: sites.name,
    chargerId: chargingSessions.chargerId,
    chargerIdentity: chargers.ocppIdentity,
    connectorId: chargingSessions.connectorId,
    connectorLabel: connectors.label,
    ocppConnectorId: connectors.ocppConnectorId,
    ocppTransactionId: chargingSessions.ocppTransactionId,
    idTag: chargingSessions.idTag,
    timeZone: chargingSessions.timeZone,
    startedAt: chargingSessions.startedAt,
    endedAt: chargingSessions.endedAt,
    unpluggedAt: chargingSessions.unpluggedAt,
    closedAt: chargingSessions.closedAt,
    meterStartWh: chargingSessions.meterStartWh,
    meterStopWh: chargingSessions.meterStopWh,
    energyWh: chargingSessions.energyWh,
    stopReason: chargingSessions.stopReason,
    failureReason: chargingSessions.failureReason,
    tariffVersionId: chargingSessions.tariffVersionId,
    currency: chargingSessions.currency,
    netAmount: chargingSessions.netAmount,
    taxAmount: chargingSessions.taxAmount,
    grossAmount: chargingSessions.grossAmount,
    pricedAt: chargingSessions.pricedAt,
    pricingEngineVersion: chargingSessions.pricingEngineVersion,
    pricingInputHash: chargingSessions.pricingInputHash,
    reviewFlags: chargingSessions.reviewFlags,
  };

  /** Newest first; the cursor is the started_at and id of the last row seen. */
  async findPage(
    tx: Transaction,
    filter: SessionFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<SessionRecord[]> {
    return this.select(tx)
      .where(SessionConditions.of(filter, cursor))
      .orderBy(...SessionConditions.ORDER)
      .limit(limit);
  }

  /** Every matching session, newest first, up to `limit` rows. */
  async findAll(tx: Transaction, filter: SessionFilter, limit: number): Promise<SessionRecord[]> {
    return this.select(tx)
      .where(SessionConditions.of(filter))
      .orderBy(...SessionConditions.ORDER)
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<SessionRecord | null> {
    const rows = await this.select(tx).where(eq(chargingSessions.id, id));
    return rows[0] ?? null;
  }

  async findTariff(tx: Transaction, versionId: string): Promise<SessionTariff | null> {
    const rows = await tx
      .select({ tariffId: tariffs.id, name: tariffs.name, versionNumber: tariffVersions.number })
      .from(tariffVersions)
      .innerJoin(tariffs, eq(tariffs.id, tariffVersions.tariffId))
      .where(eq(tariffVersions.id, versionId));
    return rows[0] ?? null;
  }

  /** The receipt, in order. */
  async findLines(tx: Transaction, sessionId: string): Promise<ReceiptLine[]> {
    const rows = await tx
      .select()
      .from(sessionLineItems)
      .where(eq(sessionLineItems.sessionId, sessionId))
      .orderBy(asc(sessionLineItems.position));
    return rows.map((row) => ({ ...row, from: row.fromAt, to: row.toAt }));
  }

  async findHistory(tx: Transaction, sessionId: string): Promise<SessionStateChangeRecord[]> {
    return tx
      .select({
        fromStatus: sessionStateChanges.fromStatus,
        toStatus: sessionStateChanges.toStatus,
        event: sessionStateChanges.event,
        occurredAt: sessionStateChanges.occurredAt,
        details: sessionStateChanges.details,
      })
      .from(sessionStateChanges)
      .where(eq(sessionStateChanges.sessionId, sessionId))
      .orderBy(asc(sessionStateChanges.occurredAt), asc(sessionStateChanges.createdAt));
  }

  async findReadings(tx: Transaction, sessionId: string): Promise<SessionReading[]> {
    return tx
      .select({
        at: meterValues.measuredAt,
        energyWh: meterValues.energyWh,
        powerW: meterValues.powerW,
        socPercent: meterValues.socPercent,
      })
      .from(meterValues)
      .where(eq(meterValues.sessionId, sessionId))
      .orderBy(asc(meterValues.measuredAt))
      .limit(SessionsRepository.MAX_READINGS);
  }

  private select(tx: Transaction) {
    return tx
      .select(SessionsRepository.COLUMNS)
      .from(chargingSessions)
      .innerJoin(sites, eq(sites.id, chargingSessions.siteId))
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .innerJoin(connectors, eq(connectors.id, chargingSessions.connectorId))
      .$dynamic();
  }
}
