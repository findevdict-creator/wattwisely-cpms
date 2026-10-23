import { Injectable } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';

/** What the queue count found, summed over every tenant. Ages are in seconds, 0 when empty. */
export interface QueueCounts {
  outboxDue: number;
  outboxOldestDueSeconds: number;
  exportsQueued: number;
  exportsOldestQueuedSeconds: number;
  webhookEventsPending: number;
  webhookOldestPendingSeconds: number;
  openAlerts: Map<string, number>;
}

/**
 * The backlog of the platform's queues (module 12): e-mails waiting to be sent, exports
 * waiting to be built, payment webhooks not yet handled, and open charger alerts. The
 * QueueStatsJob sets them every 30 seconds; the alert rules read the ages.
 */
@Injectable()
export class QueueMetrics {
  private readonly gauges;
  private readonly alerts;

  constructor(metrics: MetricsRegistry) {
    this.gauges = {
      outboxDue: metrics.gauge('outbox_due', 'E-mails due to be sent'),
      outboxOldestDueSeconds: metrics.gauge(
        'outbox_oldest_due_seconds',
        'How long the oldest due e-mail has waited',
      ),
      exportsQueued: metrics.gauge('exports_queued', 'Report exports waiting to be built'),
      exportsOldestQueuedSeconds: metrics.gauge(
        'exports_oldest_queued_seconds',
        'How long the oldest queued export has waited',
      ),
      webhookEventsPending: metrics.gauge(
        'payment_webhook_events_pending',
        'Payment webhook events not handled yet',
      ),
      webhookOldestPendingSeconds: metrics.gauge(
        'payment_webhook_oldest_pending_seconds',
        'How long the oldest unhandled payment webhook event has waited',
      ),
    };
    this.alerts = metrics.gauge('alerts_open', 'Open and acknowledged charger alerts', ['type']);
  }

  set(counts: QueueCounts): void {
    for (const key of Object.keys(this.gauges) as (keyof typeof this.gauges)[]) {
      this.gauges[key].set(counts[key]);
    }
    this.alerts.reset();
    for (const [type, count] of counts.openAlerts) {
      this.alerts.set({ type }, count);
    }
  }
}
