import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { WebhookEventEnvelope } from '@wattwisely/webhooks';
import { WebhookEvent, WebhookEventSource } from './webhook-event';
import { EndpointRow, WebhooksRepository } from './webhooks.repository';

export const WEBHOOK_EVENT_SOURCES = Symbol('WEBHOOK_EVENT_SOURCES');

/**
 * Finds a tenant's new events and queues a delivery per endpoint that listens for them
 * (module 16). Each endpoint keeps its own mark, `scanned_to`: the scan reads from the mark to
 * a moment just before now (so a row still being written is not missed), queues, and moves the
 * mark on, all in one transaction. A tenant without active endpoints costs one query.
 */
@Injectable()
export class WebhookEventScanner {
  /** Rows committed in the last two seconds are left for the next run: created_at is set before the commit. */
  static readonly SETTLE_MS = 2_000;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly webhooks: WebhooksRepository,
    @Inject(WEBHOOK_EVENT_SOURCES) private readonly sources: WebhookEventSource[],
  ) {}

  /** How many deliveries were queued for the tenant. */
  async scan(tenantId: string, now: Date): Promise<number> {
    const to = new Date(now.getTime() - WebhookEventScanner.SETTLE_MS);
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      const endpoints = await this.webhooks.findActiveEndpoints(tx);
      let queued = 0;
      for (const endpoint of endpoints) {
        queued += await this.scanEndpoint(tx, endpoint, to);
      }
      return queued;
    });
  }

  private async scanEndpoint(tx: Transaction, endpoint: EndpointRow, to: Date): Promise<number> {
    if (to <= endpoint.scannedTo) {
      return 0;
    }
    const events = await this.collect(tx, endpoint, to);
    const queued = await this.webhooks.queue(
      tx,
      events.map((event) => this.delivery(endpoint, event)),
    );
    await this.webhooks.markScanned(tx, endpoint.id, to);
    return queued;
  }

  private async collect(tx: Transaction, endpoint: EndpointRow, to: Date): Promise<WebhookEvent[]> {
    const wanted = new Set(endpoint.eventTypes);
    const events: WebhookEvent[] = [];
    for (const source of this.sources) {
      if (source.types.some((type) => wanted.has(type))) {
        const found = await source.collect(tx, endpoint.scannedTo, to);
        events.push(...found.filter((event) => wanted.has(event.type)));
      }
    }
    return events;
  }

  private delivery(endpoint: EndpointRow, event: WebhookEvent) {
    const id = UuidV7.create();
    return {
      id,
      tenantId: endpoint.tenantId,
      endpointId: endpoint.id,
      eventType: event.type,
      eventId: event.eventId,
      payload: WebhookEventEnvelope.build({
        id,
        type: event.type,
        tenantId: endpoint.tenantId,
        occurredAt: event.occurredAt,
        data: event.data,
      }),
    };
  }
}
