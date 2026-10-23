import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, SQL } from 'drizzle-orm';
import {
  chargers,
  chargingSessions,
  connectors,
  payments,
  refunds,
  sites,
  Transaction,
} from '@wattwisely/db';
import { RefundRow, RefundStatus } from '@wattwisely/payments';
import { SiteScopeCondition } from '../../../common/database/site-scope.condition';
import { ListCursor } from '../../../common/paging/list-cursor';
import { SiteScope } from '../../../common/permissions/site-scope';
import { PaymentConditions, PaymentFilter } from './payment-filter';
import { PaymentRecord } from './payment-record';

/** Reads payments and refunds for staff, joined to where the session happened. RLS limits every query to the tenant. */
@Injectable()
export class PaymentsRepository {
  static readonly COLUMNS = {
    id: payments.id,
    sessionId: payments.sessionId,
    type: payments.type,
    status: payments.status,
    currency: payments.currency,
    holdAmount: payments.holdAmount,
    authorizedAmount: payments.authorizedAmount,
    capturedAmount: payments.capturedAmount,
    refundedAmount: payments.refundedAmount,
    provider: payments.provider,
    providerPaymentId: payments.providerPaymentId,
    cardBrand: payments.cardBrand,
    cardLast4: payments.cardLast4,
    failureCode: payments.failureCode,
    failureMessage: payments.failureMessage,
    captureAttempts: payments.captureAttempts,
    authorizedAt: payments.authorizedAt,
    capturedAt: payments.capturedAt,
    releasedAt: payments.releasedAt,
    failedAt: payments.failedAt,
    reviewFlags: payments.reviewFlags,
    version: payments.version,
    createdAt: payments.createdAt,
    updatedAt: payments.updatedAt,
    siteId: chargingSessions.siteId,
    siteName: sites.name,
    chargerId: chargingSessions.chargerId,
    chargerIdentity: chargers.ocppIdentity,
    connectorLabel: connectors.label,
    sessionStatus: chargingSessions.status,
    sessionStartedAt: chargingSessions.startedAt,
    sessionGrossAmount: chargingSessions.grossAmount,
    energyWh: chargingSessions.energyWh,
  };

  /** Newest first; the cursor is the created_at and id of the last row seen. */
  async findPage(
    tx: Transaction,
    filter: PaymentFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<PaymentRecord[]> {
    return this.select(tx)
      .where(PaymentConditions.of(filter, cursor))
      .orderBy(...PaymentConditions.ORDER)
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<PaymentRecord | null> {
    const rows = await this.select(tx).where(eq(payments.id, id));
    return rows[0] ?? null;
  }

  async findBySession(tx: Transaction, sessionId: string): Promise<PaymentRecord | null> {
    const rows = await this.select(tx).where(
      and(eq(payments.sessionId, sessionId), eq(payments.type, 'preauth')),
    );
    return rows[0] ?? null;
  }

  /** Refunds within the caller's sites, newest first, optionally in some states. */
  async findRefunds(
    tx: Transaction,
    scope: SiteScope,
    statuses: RefundStatus[] | undefined,
    limit: number,
  ): Promise<RefundRow[]> {
    const conditions: (SQL | undefined)[] = [
      SiteScopeCondition.on(chargingSessions.siteId, scope),
      statuses ? inArray(refunds.status, statuses) : undefined,
    ];
    const rows = await tx
      .select({ refund: refunds })
      .from(refunds)
      .innerJoin(chargingSessions, eq(chargingSessions.id, refunds.sessionId))
      .where(and(...conditions))
      .orderBy(desc(refunds.createdAt), desc(refunds.id))
      .limit(limit);
    return rows.map((row) => row.refund);
  }

  private select(tx: Transaction) {
    return tx
      .select(PaymentsRepository.COLUMNS)
      .from(payments)
      .innerJoin(chargingSessions, eq(chargingSessions.id, payments.sessionId))
      .innerJoin(sites, eq(sites.id, chargingSessions.siteId))
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .innerJoin(connectors, eq(connectors.id, chargingSessions.connectorId))
      .$dynamic();
  }
}
