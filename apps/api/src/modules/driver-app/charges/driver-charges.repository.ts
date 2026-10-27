import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  chargers,
  chargingSessions,
  connectors,
  payments,
  sites,
  tenants,
  Transaction,
} from '@wattwisely/db';
import { DriverChargeRecord } from './driver-charge-record';

/**
 * Reads a driver's sessions inside one operator's tenant (module 19): the transaction has
 * been switched into that tenant, and the driver record's id keeps other drivers' sessions out.
 */
@Injectable()
export class DriverChargesRepository {
  static readonly COLUMNS = {
    id: chargingSessions.id,
    tenantId: chargingSessions.tenantId,
    operatorName: tenants.name,
    driverId: chargingSessions.driverId,
    status: chargingSessions.status,
    siteName: sites.name,
    chargerIdentity: chargers.ocppIdentity,
    connectorId: chargingSessions.connectorId,
    connectorLabel: connectors.label,
    ocppConnectorId: connectors.ocppConnectorId,
    ocppTransactionId: chargingSessions.ocppTransactionId,
    timeZone: chargingSessions.timeZone,
    startedAt: chargingSessions.startedAt,
    endedAt: chargingSessions.endedAt,
    energyWh: chargingSessions.energyWh,
    currency: chargingSessions.currency,
    grossAmount: chargingSessions.grossAmount,
    pricedAt: chargingSessions.pricedAt,
    failureReason: chargingSessions.failureReason,
    isPaid: chargingSessions.isPaid,
    startSource: chargingSessions.startSource,
    paymentRule: chargingSessions.paymentRule,
    paymentStatus: payments.status,
    holdAmount: payments.holdAmount,
    capturedAmount: payments.capturedAmount,
    cardBrand: payments.cardBrand,
    cardLast4: payments.cardLast4,
    failureMessage: payments.failureMessage,
  };

  /** The driver's newest sessions at this operator. */
  async findForDriver(
    tx: Transaction,
    driverId: string,
    limit: number,
  ): Promise<DriverChargeRecord[]> {
    return this.select(tx)
      .where(eq(chargingSessions.driverId, driverId))
      .orderBy(desc(chargingSessions.startedAt))
      .limit(limit);
  }

  async findById(
    tx: Transaction,
    driverId: string,
    sessionId: string,
  ): Promise<DriverChargeRecord | null> {
    const rows = await this.select(tx).where(
      and(eq(chargingSessions.id, sessionId), eq(chargingSessions.driverId, driverId)),
    );
    return rows[0] ?? null;
  }

  private select(tx: Transaction) {
    return tx
      .select(DriverChargesRepository.COLUMNS)
      .from(chargingSessions)
      .innerJoin(tenants, eq(tenants.id, chargingSessions.tenantId))
      .innerJoin(sites, eq(sites.id, chargingSessions.siteId))
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .innerJoin(connectors, eq(connectors.id, chargingSessions.connectorId))
      .leftJoin(payments, eq(payments.sessionId, chargingSessions.id))
      .$dynamic();
  }
}
