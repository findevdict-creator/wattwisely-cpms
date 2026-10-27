import { Injectable } from '@nestjs/common';
import { and, count, eq, isNull, lte, min, ne, sql } from 'drizzle-orm';
import {
  alerts,
  DatabaseSession,
  notifications,
  paymentWebhookEvents,
  reportExports,
  Transaction,
  TransactionRunner,
} from '@wattwisely/db';
import { QueueCounts } from '../metrics/queue-metrics';

/** One queue's size and the time its oldest item has waited since. */
interface Backlog {
  size: number;
  oldest: Date | null;
}

/**
 * Counts the queues for the monitoring (module 12): inside each tenant, as row-level
 * security asks, then summed. Only counts and ages leave this class, never a row.
 */
@Injectable()
export class QueueCounter {
  constructor(private readonly runner: TransactionRunner) {}

  async count(tenantIds: string[], now: Date): Promise<QueueCounts> {
    const counts = QueueCounter.empty();
    for (const tenantId of tenantIds) {
      await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
        this.addTenant(tx, counts, now),
      );
    }
    const webhooks = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      QueueCounter.backlog(
        tx
          .select({ size: count(), oldest: min(paymentWebhookEvents.receivedAt) })
          .from(paymentWebhookEvents)
          .where(isNull(paymentWebhookEvents.processedAt)),
      ),
    );
    counts.webhookEventsPending = webhooks.size;
    counts.webhookOldestPendingSeconds = QueueCounter.age(webhooks.oldest, now);
    return counts;
  }

  private async addTenant(tx: Transaction, counts: QueueCounts, now: Date): Promise<void> {
    const outbox = await QueueCounter.backlog(
      tx
        .select({ size: count(), oldest: min(notifications.sendAfter) })
        .from(notifications)
        .where(and(eq(notifications.status, 'pending'), lte(notifications.sendAfter, now))),
    );
    const exports = await QueueCounter.backlog(
      tx
        .select({ size: count(), oldest: min(reportExports.createdAt) })
        .from(reportExports)
        .where(eq(reportExports.status, 'queued')),
    );
    counts.outboxDue += outbox.size;
    counts.outboxOldestDueSeconds = Math.max(
      counts.outboxOldestDueSeconds,
      QueueCounter.age(outbox.oldest, now),
    );
    counts.exportsQueued += exports.size;
    counts.exportsOldestQueuedSeconds = Math.max(
      counts.exportsOldestQueuedSeconds,
      QueueCounter.age(exports.oldest, now),
    );
    await this.addAlerts(tx, counts);
  }

  private async addAlerts(tx: Transaction, counts: QueueCounts): Promise<void> {
    const rows = await tx
      .select({ type: alerts.type, size: sql<number>`count(*)::int` })
      .from(alerts)
      .where(ne(alerts.status, 'closed'))
      .groupBy(alerts.type);
    for (const row of rows) {
      counts.openAlerts.set(row.type, (counts.openAlerts.get(row.type) ?? 0) + row.size);
    }
  }

  private static async backlog(
    query: Promise<{ size: number; oldest: Date | null }[]>,
  ): Promise<Backlog> {
    const [row] = await query;
    return { size: Number(row?.size ?? 0), oldest: row?.oldest ? new Date(row.oldest) : null };
  }

  private static age(oldest: Date | null, now: Date): number {
    return oldest ? Math.max(0, (now.getTime() - oldest.getTime()) / 1000) : 0;
  }

  private static empty(): QueueCounts {
    return {
      outboxDue: 0,
      outboxOldestDueSeconds: 0,
      exportsQueued: 0,
      exportsOldestQueuedSeconds: 0,
      webhookEventsPending: 0,
      webhookOldestPendingSeconds: 0,
      openAlerts: new Map(),
    };
  }
}
