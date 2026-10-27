import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';
import { chargingSessions, sessionStateChanges, Transaction } from '@wattwisely/db';
import { WebhookEvent, WebhookEventSource } from '../webhook-event';

/** The columns of a session that go into the event's data. */
interface SessionSnapshot {
  id: string;
  status: string;
  siteId: string;
  chargerId: string;
  connectorId: string;
  driverId: string | null;
  rfidCardId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  energyWh: number;
  currency: string | null;
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  failureReason: string | null;
}

/**
 * Session events from session_state_changes (module 16): a change to `charging` from the
 * start states is session.started, to `completed` is session.completed, to `failed` or
 * `not_started` is session.failed. The window is on created_at, when the platform learned of
 * it, so a late charger clock cannot put an event before an endpoint's mark.
 */
@Injectable()
export class SessionEventSource implements WebhookEventSource {
  static readonly START_STATES: (string | null)[] = [null, 'authorising', 'starting'];
  static readonly TYPE_OF: Record<string, string> = {
    charging: 'session.started',
    completed: 'session.completed',
    failed: 'session.failed',
    not_started: 'session.failed',
  };

  readonly types = ['session.started', 'session.completed', 'session.failed'];

  async collect(tx: Transaction, from: Date, to: Date): Promise<WebhookEvent[]> {
    const rows = await tx
      .select({
        id: sessionStateChanges.id,
        fromStatus: sessionStateChanges.fromStatus,
        toStatus: sessionStateChanges.toStatus,
        occurredAt: sessionStateChanges.occurredAt,
        session: SessionEventSource.sessionColumns(),
      })
      .from(sessionStateChanges)
      .innerJoin(chargingSessions, eq(chargingSessions.id, sessionStateChanges.sessionId))
      .where(
        and(
          gt(sessionStateChanges.createdAt, from),
          lte(sessionStateChanges.createdAt, to),
          inArray(sessionStateChanges.toStatus, ['charging', 'completed', 'failed', 'not_started']),
        ),
      )
      .orderBy(asc(sessionStateChanges.createdAt), asc(sessionStateChanges.id));
    return rows
      .filter((row) => SessionEventSource.isEvent(row.fromStatus, row.toStatus))
      .map((row) => ({
        type: SessionEventSource.TYPE_OF[row.toStatus],
        eventId: row.id,
        occurredAt: row.occurredAt,
        data: SessionEventSource.describe(row.session),
      }));
  }

  /** Charging after a pause (suspended, idle) is not a new start. */
  private static isEvent(fromStatus: string | null, toStatus: string): boolean {
    return toStatus !== 'charging' || SessionEventSource.START_STATES.includes(fromStatus);
  }

  private static sessionColumns() {
    return {
      id: chargingSessions.id,
      status: chargingSessions.status,
      siteId: chargingSessions.siteId,
      chargerId: chargingSessions.chargerId,
      connectorId: chargingSessions.connectorId,
      driverId: chargingSessions.driverId,
      rfidCardId: chargingSessions.rfidCardId,
      startedAt: chargingSessions.startedAt,
      endedAt: chargingSessions.endedAt,
      energyWh: chargingSessions.energyWh,
      currency: chargingSessions.currency,
      netAmount: chargingSessions.netAmount,
      taxAmount: chargingSessions.taxAmount,
      grossAmount: chargingSessions.grossAmount,
      failureReason: chargingSessions.failureReason,
    };
  }

  /** The session as the API's GET /v1/sessions/{id} names its fields, as far as a receiver needs. */
  private static describe(session: SessionSnapshot): Record<string, unknown> {
    return {
      id: session.id,
      status: session.status,
      site_id: session.siteId,
      charger_id: session.chargerId,
      connector_id: session.connectorId,
      driver_id: session.driverId,
      rfid_card_id: session.rfidCardId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString() ?? null,
      energy_wh: session.energyWh,
      currency: session.currency,
      net_amount: session.netAmount,
      tax_amount: session.taxAmount,
      gross_amount: session.grossAmount,
      failure_reason: session.failureReason,
    };
  }
}
