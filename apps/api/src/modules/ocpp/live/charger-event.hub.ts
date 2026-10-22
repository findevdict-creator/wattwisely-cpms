import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, Notification } from 'pg';
import { ChargerEvent, NotifyChannels } from '@wattwisely/ocpp-contracts';
import { Observable, Subject } from 'rxjs';
import { ApiConfig } from '../../../config/api.config';

/**
 * Listens on the Postgres channel the gateway publishes live events to, and fans them
 * out to every open live stream in this API process. One LISTEN connection per process;
 * it reconnects by itself if Postgres drops it.
 */
@Injectable()
export class ChargerEventHub implements OnModuleInit, OnModuleDestroy {
  static readonly RECONNECT_DELAY_MS = 5_000;

  private readonly logger = new Logger(ChargerEventHub.name);
  private readonly subject = new Subject<ChargerEvent>();
  private client: Client | null = null;
  private isStopping = false;

  constructor(private readonly config: ApiConfig) {}

  /** Every event from every charger; subscribers filter by tenant and charger. */
  get events(): Observable<ChargerEvent> {
    return this.subject.asObservable();
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.isStopping = true;
    this.subject.complete();
    await this.client?.end().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: this.config.databaseUrl });
    client.on('notification', (notification) => this.receive(notification));
    client.on('error', (error) => this.lost(error));
    try {
      await client.connect();
      await client.query(`listen ${NotifyChannels.EVENTS}`);
      this.client = client;
    } catch (error) {
      this.lost(error as Error);
    }
  }

  private receive(notification: Notification): void {
    try {
      this.subject.next(JSON.parse(notification.payload ?? '') as ChargerEvent);
    } catch {
      this.logger.warn('Ignored a live event that was not JSON');
    }
  }

  private lost(error: Error): void {
    if (this.isStopping) {
      return;
    }
    this.logger.warn(`Live event listener lost: ${error.message}; reconnecting`);
    this.client = null;
    setTimeout(() => void this.connect(), ChargerEventHub.RECONNECT_DELAY_MS).unref();
  }
}
