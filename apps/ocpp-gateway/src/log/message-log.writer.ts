import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseSession, ocppMessages, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { GatewayMetrics } from '../metrics/gateway-metrics';
import { MessageLogEntry } from './message-log-entry';

/**
 * Appends every frame, in and out, to ocpp_messages. Entries are queued and written in
 * batches (every second or every 500 frames), so logging never delays a reply to a
 * charger. A write failure is logged and the batch dropped: the log is a help, not truth.
 */
@Injectable()
export class MessageLogWriter implements OnModuleInit, OnModuleDestroy {
  static readonly FLUSH_INTERVAL_MS = 1_000;
  static readonly BATCH_SIZE = 500;

  private readonly logger = new Logger(MessageLogWriter.name);
  private queue: MessageLogEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> = Promise.resolve();

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly metrics: GatewayMetrics,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), MessageLogWriter.FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.flush();
  }

  record(entry: MessageLogEntry): void {
    this.queue.push(entry);
    if (this.queue.length >= MessageLogWriter.BATCH_SIZE) {
      void this.flush();
    }
  }

  /** Writes everything queued so far, one transaction per tenant. Tests call this to read the log. */
  flush(): Promise<void> {
    this.flushing = this.flushing.then(() => this.writeQueued());
    return this.flushing;
  }

  private async writeQueued(): Promise<void> {
    const batch = this.queue;
    this.queue = [];
    const byTenant = new Map<string, MessageLogEntry[]>();
    for (const entry of batch) {
      byTenant.set(entry.tenantId, [...(byTenant.get(entry.tenantId) ?? []), entry]);
    }
    for (const [tenantId, entries] of byTenant) {
      await this.write(tenantId, entries);
    }
  }

  private async write(tenantId: string, entries: MessageLogEntry[]): Promise<void> {
    try {
      await this.transactionRunner.run(DatabaseSession.forTenant(tenantId), (tx) =>
        tx.insert(ocppMessages).values(
          entries.map((entry) => ({
            id: UuidV7.create(),
            tenantId: entry.tenantId,
            chargerId: entry.chargerId,
            direction: entry.direction,
            messageType: entry.messageType,
            messageId: entry.messageId,
            action: entry.action,
            payload: entry.payload ?? null,
            errorCode: entry.errorCode,
            receivedAt: entry.receivedAt,
          })),
        ),
      );
    } catch (error) {
      this.metrics.droppedLog(entries.length);
      this.logger.error(
        `Dropped ${entries.length} message log entries: ${(error as Error).message}`,
      );
    }
  }
}
