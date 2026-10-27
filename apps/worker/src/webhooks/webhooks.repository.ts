import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { Transaction, webhookDeliveries, webhookEndpoints } from '@wattwisely/db';

/** An endpoint as the scan and the delivery need it. */
export interface EndpointRow {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  scannedTo: Date;
  failureCount: number;
}

/** A delivery that is due, with its endpoint. */
export interface DueDelivery {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  endpoint: EndpointRow;
}

/** What one try told us. */
export interface AttemptOutcome {
  isDelivered: boolean;
  statusCode: number | null;
  error: string | null;
  /** When to try again, or null when the delivery is over, one way or the other. */
  nextAttemptAt: Date | null;
}

/** Reads and writes endpoints and deliveries for the worker's two webhook jobs (module 16). */
@Injectable()
export class WebhooksRepository {
  async findActiveEndpoints(tx: Transaction): Promise<EndpointRow[]> {
    return tx
      .select(WebhooksRepository.endpointColumns())
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.isActive, true))
      .orderBy(asc(webhookEndpoints.createdAt));
  }

  /** Queues the deliveries; one already queued for the same event and endpoint is left alone. */
  async queue(tx: Transaction, rows: (typeof webhookDeliveries.$inferInsert)[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const inserted = await tx
      .insert(webhookDeliveries)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: webhookDeliveries.id });
    return inserted.length;
  }

  async markScanned(tx: Transaction, endpointId: string, scannedTo: Date): Promise<void> {
    await tx.update(webhookEndpoints).set({ scannedTo }).where(eq(webhookEndpoints.id, endpointId));
  }

  /** Pending deliveries whose time has come, oldest first, for endpoints that are not paused. */
  async findDue(tx: Transaction, now: Date, limit: number): Promise<DueDelivery[]> {
    const rows = await tx
      .select({
        id: webhookDeliveries.id,
        eventType: webhookDeliveries.eventType,
        payload: webhookDeliveries.payload,
        attempts: webhookDeliveries.attempts,
        endpoint: WebhooksRepository.endpointColumns(),
      })
      .from(webhookDeliveries)
      .innerJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
      .where(
        and(
          eq(webhookDeliveries.status, 'pending'),
          lte(webhookDeliveries.nextAttemptAt, now),
          eq(webhookEndpoints.isActive, true),
        ),
      )
      .orderBy(asc(webhookDeliveries.nextAttemptAt), asc(webhookDeliveries.id))
      .limit(limit);
    return rows;
  }

  /** Writes what a try told us on the delivery and on its endpoint. */
  async recordAttempt(
    tx: Transaction,
    delivery: DueDelivery,
    outcome: AttemptOutcome,
    now: Date,
  ): Promise<void> {
    const status = outcome.isDelivered ? 'delivered' : outcome.nextAttemptAt ? 'pending' : 'failed';
    await tx
      .update(webhookDeliveries)
      .set({
        status,
        attempts: delivery.attempts + 1,
        lastAttemptAt: now,
        nextAttemptAt: outcome.nextAttemptAt ?? now,
        lastStatusCode: outcome.statusCode,
        lastError: outcome.error,
        deliveredAt: outcome.isDelivered ? now : null,
      })
      .where(eq(webhookDeliveries.id, delivery.id));
    await tx
      .update(webhookEndpoints)
      .set({
        lastDeliveryAt: now,
        failureCount: outcome.isDelivered ? 0 : sql`${webhookEndpoints.failureCount} + 1`,
      })
      .where(eq(webhookEndpoints.id, delivery.endpoint.id));
  }

  private static endpointColumns() {
    return {
      id: webhookEndpoints.id,
      tenantId: webhookEndpoints.tenantId,
      url: webhookEndpoints.url,
      secret: webhookEndpoints.secret,
      eventTypes: webhookEndpoints.eventTypes,
      isActive: webhookEndpoints.isActive,
      scannedTo: webhookEndpoints.scannedTo,
      failureCount: webhookEndpoints.failureCount,
    };
  }
}
