import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { connectors, Transaction, UuidV7 } from '@wattwisely/db';
import { ConnectorLabel, ConnectorStatus } from '@wattwisely/ocpp-contracts';

/** A connector as the gateway sees it. */
export interface GatewayConnector {
  id: string;
  ocppConnectorId: number;
  status: string;
}

/** What a StatusNotification changes on a connector. */
export interface ConnectorStatusUpdate {
  status: ConnectorStatus;
  errorCode: string | null;
  vendorErrorCode: string | null;
  statusInfo: string | null;
  changedAt: Date;
}

/** The gateway's reads and writes on the connectors table. */
@Injectable()
export class GatewayConnectorsRepository {
  static readonly COLUMNS = {
    id: connectors.id,
    ocppConnectorId: connectors.ocppConnectorId,
    status: connectors.status,
  };

  async findByNumber(tx: Transaction, chargerId: string, ocppConnectorId: number) {
    const rows = await tx
      .select(GatewayConnectorsRepository.COLUMNS)
      .from(connectors)
      .where(
        and(eq(connectors.chargerId, chargerId), eq(connectors.ocppConnectorId, ocppConnectorId)),
      );
    return (rows[0] as GatewayConnector | undefined) ?? null;
  }

  /**
   * The connector with this number, created on the spot when the charger reports one
   * nobody added in the portal (the next free letter becomes its label). On OCPP 2.0.1
   * the number is the EVSE id (module 18), and the row says so in `evse_id`.
   */
  async findOrCreate(
    tx: Transaction,
    charger: { id: string; tenantId: string },
    ocppConnectorId: number,
    evseId: number | null = null,
  ) {
    const existing = await this.findByNumber(tx, charger.id, ocppConnectorId);
    if (existing) {
      return existing;
    }
    const taken = await tx
      .select({ label: connectors.label })
      .from(connectors)
      .where(eq(connectors.chargerId, charger.id));
    const row = {
      id: UuidV7.create(),
      tenantId: charger.tenantId,
      chargerId: charger.id,
      ocppConnectorId,
      evseId,
      label: ConnectorLabel.next(taken.map((item) => item.label)),
    };
    await tx.insert(connectors).values(row);
    return { id: row.id, ocppConnectorId, status: 'unknown' } as GatewayConnector;
  }

  async updateStatus(tx: Transaction, id: string, update: ConnectorStatusUpdate): Promise<void> {
    await tx
      .update(connectors)
      .set({
        status: update.status,
        errorCode: update.errorCode,
        vendorErrorCode: update.vendorErrorCode,
        statusInfo: update.statusInfo,
        statusChangedAt: update.changedAt,
      })
      .where(eq(connectors.id, id));
  }

  /** When a charger stays away: every connector shows unavailable until it reports again. */
  async markAllUnavailable(
    tx: Transaction,
    chargerId: string,
    info: string,
  ): Promise<GatewayConnector[]> {
    const rows = await tx
      .update(connectors)
      .set({ status: 'unavailable', statusInfo: info, statusChangedAt: sql`now()` })
      .where(and(eq(connectors.chargerId, chargerId), sql`${connectors.status} <> 'unavailable'`))
      .returning(GatewayConnectorsRepository.COLUMNS);
    return rows as GatewayConnector[];
  }
}
