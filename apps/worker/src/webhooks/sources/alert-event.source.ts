import { Injectable } from '@nestjs/common';
import { and, asc, gt, lte } from 'drizzle-orm';
import { alerts, Transaction } from '@wattwisely/db';
import { WebhookEvent, WebhookEventSource } from '../webhook-event';

/**
 * Alert events from the alerts table (module 16): an alert opened in the window is
 * alert.opened, one closed in it is alert.closed. Both can come from the same row.
 */
@Injectable()
export class AlertEventSource implements WebhookEventSource {
  readonly types = ['alert.opened', 'alert.closed'];

  async collect(tx: Transaction, from: Date, to: Date): Promise<WebhookEvent[]> {
    const [opened, closed] = await Promise.all([
      this.rows(tx, and(gt(alerts.openedAt, from), lte(alerts.openedAt, to))),
      this.rows(tx, and(gt(alerts.closedAt, from), lte(alerts.closedAt, to))),
    ]);
    return [
      ...opened.map((row) => AlertEventSource.event('alert.opened', row, row.openedAt)),
      ...closed.map((row) => AlertEventSource.event('alert.closed', row, row.closedAt as Date)),
    ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }

  private rows(tx: Transaction, where: ReturnType<typeof and>) {
    return tx
      .select({
        id: alerts.id,
        type: alerts.type,
        status: alerts.status,
        title: alerts.title,
        details: alerts.details,
        siteId: alerts.siteId,
        chargerId: alerts.chargerId,
        connectorId: alerts.connectorId,
        sessionId: alerts.sessionId,
        beganAt: alerts.beganAt,
        openedAt: alerts.openedAt,
        closedAt: alerts.closedAt,
        closeReason: alerts.closeReason,
      })
      .from(alerts)
      .where(where)
      .orderBy(asc(alerts.openedAt), asc(alerts.id));
  }

  private static event(
    type: string,
    row: Awaited<ReturnType<AlertEventSource['rows']>>[number],
    occurredAt: Date,
  ): WebhookEvent {
    return {
      type,
      eventId: `${row.id}:${type === 'alert.opened' ? 'opened' : 'closed'}`,
      occurredAt,
      data: {
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        details: row.details,
        site_id: row.siteId,
        charger_id: row.chargerId,
        connector_id: row.connectorId,
        session_id: row.sessionId,
        began_at: row.beganAt.toISOString(),
        opened_at: row.openedAt.toISOString(),
        closed_at: row.closedAt?.toISOString() ?? null,
        close_reason: row.closeReason,
      },
    };
  }
}
