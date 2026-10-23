import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, isNull, like, lt, max, or, sql, sum } from 'drizzle-orm';
import {
  auditLog,
  chargerBootEvents,
  chargers,
  chargingSessions,
  ocppMessages,
  refunds,
  sites,
  Transaction,
} from '@wattwisely/db';
import { ReportMonth } from './report-month';
import { ChargerReportRow, ServiceReportData, TariffChangeRow } from './service-report-data';

/** Per-charger counts keyed by charger id. */
type Counts = Map<string, number>;

/**
 * Gathers the monthly service report (story MGT-04) from what the platform already records:
 * sessions, boot events, fault reports, refunds and the audit log. Runs inside a transaction
 * in the tenant, so row-level security limits every query to it.
 */
@Injectable()
export class ServiceReportRepository {
  async gather(tx: Transaction, tenantId: string, month: ReportMonth): Promise<ServiceReportData> {
    const [sessions, boots, faults] = await Promise.all([
      this.sessions(tx, month),
      this.boots(tx, month),
      this.faults(tx, month),
    ]);
    const chargerRows = await this.chargers(tx);
    return {
      tenantId,
      currency: sessions.currency,
      chargers: chargerRows.map((charger) => ({
        ...charger,
        ...(sessions.byCharger.get(charger.chargerId) ?? { sessions: 0, energyWh: 0, revenue: 0 }),
        boots: boots.get(charger.chargerId) ?? 0,
        faults: faults.get(charger.chargerId) ?? 0,
      })),
      refunds: await this.refunds(tx, month),
      tariffChanges: await this.tariffChanges(tx, month),
      actionsByWattwisely: await this.actionsByWattwisely(tx, month),
    };
  }

  private async chargers(tx: Transaction) {
    return tx
      .select({ chargerId: chargers.id, ocppIdentity: chargers.ocppIdentity, siteName: sites.name })
      .from(chargers)
      .innerJoin(sites, eq(sites.id, chargers.siteId))
      .where(isNull(chargers.deletedAt))
      .orderBy(asc(sites.name), asc(chargers.ocppIdentity));
  }

  private async sessions(tx: Transaction, month: ReportMonth) {
    const rows = await tx
      .select({
        chargerId: chargingSessions.chargerId,
        sessions: count(),
        energyWh: sum(chargingSessions.energyWh).mapWith(Number),
        revenue: sum(chargingSessions.grossAmount).mapWith(Number),
        currency: max(chargingSessions.currency),
      })
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.status, 'completed'),
          gte(chargingSessions.startedAt, month.from),
          lt(chargingSessions.startedAt, month.to),
        ),
      )
      .groupBy(chargingSessions.chargerId);
    const byCharger = new Map<string, Pick<ChargerReportRow, 'sessions' | 'energyWh' | 'revenue'>>(
      rows.map((row) => [
        row.chargerId,
        { sessions: row.sessions, energyWh: row.energyWh || 0, revenue: row.revenue || 0 },
      ]),
    );
    return { byCharger, currency: rows.find((row) => row.currency)?.currency ?? null };
  }

  private async boots(tx: Transaction, month: ReportMonth): Promise<Counts> {
    const rows = await tx
      .select({ chargerId: chargerBootEvents.chargerId, boots: count() })
      .from(chargerBootEvents)
      .where(
        and(gte(chargerBootEvents.bootedAt, month.from), lt(chargerBootEvents.bootedAt, month.to)),
      )
      .groupBy(chargerBootEvents.chargerId);
    return new Map(rows.map((row) => [row.chargerId, row.boots]));
  }

  /** StatusNotifications reporting Faulted, in OCPP 1.6 (status) and 2.0.1 (connectorStatus). */
  private async faults(tx: Transaction, month: ReportMonth): Promise<Counts> {
    const rows = await tx
      .select({ chargerId: ocppMessages.chargerId, faults: count() })
      .from(ocppMessages)
      .where(
        and(
          eq(ocppMessages.direction, 'in'),
          eq(ocppMessages.action, 'StatusNotification'),
          or(
            sql`${ocppMessages.payload}->>'status' = 'Faulted'`,
            sql`${ocppMessages.payload}->>'connectorStatus' = 'Faulted'`,
          ),
          gte(ocppMessages.receivedAt, month.from),
          lt(ocppMessages.receivedAt, month.to),
        ),
      )
      .groupBy(ocppMessages.chargerId);
    return new Map(rows.map((row) => [row.chargerId, row.faults]));
  }

  private async refunds(tx: Transaction, month: ReportMonth) {
    const [row] = await tx
      .select({ count: count(), total: sum(refunds.amount).mapWith(Number) })
      .from(refunds)
      .where(
        and(
          eq(refunds.status, 'succeeded'),
          gte(refunds.createdAt, month.from),
          lt(refunds.createdAt, month.to),
        ),
      );
    return { count: row.count, total: row.total || 0 };
  }

  private async tariffChanges(tx: Transaction, month: ReportMonth): Promise<TariffChangeRow[]> {
    return tx
      .select({
        action: auditLog.action,
        targetLabel: auditLog.targetLabel,
        occurredAt: auditLog.occurredAt,
        actorLabel: auditLog.actorLabel,
        actorType: auditLog.actorType,
      })
      .from(auditLog)
      .where(
        and(
          or(like(auditLog.action, 'tariffs.%'), like(auditLog.action, 'tariff_proposals.%')),
          gte(auditLog.occurredAt, month.from),
          lt(auditLog.occurredAt, month.to),
        ),
      )
      .orderBy(asc(auditLog.occurredAt));
  }

  private async actionsByWattwisely(tx: Transaction, month: ReportMonth): Promise<number> {
    const [row] = await tx
      .select({ count: count() })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorType, 'managed'),
          gte(auditLog.occurredAt, month.from),
          lt(auditLog.occurredAt, month.to),
        ),
      );
    return row.count;
  }
}
