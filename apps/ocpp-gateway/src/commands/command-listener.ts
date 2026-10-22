import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, Notification } from 'pg';
import { CommandNotification, NotifyChannels } from '@wattwisely/ocpp-contracts';
import { GatewayConfig } from '../config/gateway.config';
import { ConnectionRegistry } from '../connection/connection-registry';
import { CommandDispatcher } from './command-dispatcher';
import { CommandStore } from './command-store';

/**
 * Hears the API's "a command is waiting" notifications on the Postgres channel. The
 * instance holding the charger's socket sends it; the others ignore it. A charger
 * that is not connected here, or not booted yet, gets the command at its next boot.
 */
@Injectable()
export class CommandListener implements OnModuleInit, OnModuleDestroy {
  static readonly RECONNECT_DELAY_MS = 5_000;

  private readonly logger = new Logger(CommandListener.name);
  private client: Client | null = null;
  private isStopping = false;

  constructor(
    private readonly config: GatewayConfig,
    private readonly registry: ConnectionRegistry,
    private readonly store: CommandStore,
    private readonly dispatcher: CommandDispatcher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.isStopping = true;
    await this.client?.end().catch(() => undefined);
  }

  /** Handles one notification; public so tests can feed it directly. */
  async receive(notification: CommandNotification): Promise<void> {
    const connection = this.registry.find(notification.charger_id);
    if (!connection?.isBooted || connection.charger.tenantId !== notification.tenant_id) {
      return;
    }
    const command = await this.store.load(notification.tenant_id, notification.command_id);
    if (command?.status === 'queued') {
      await this.dispatcher.dispatch(connection, command);
    }
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: this.config.databaseUrl });
    client.on('notification', (notification) => void this.parse(notification));
    client.on('error', (error) => this.lost(error));
    try {
      await client.connect();
      await client.query(`listen ${NotifyChannels.COMMANDS}`);
      this.client = client;
    } catch (error) {
      this.lost(error as Error);
    }
  }

  private async parse(notification: Notification): Promise<void> {
    try {
      await this.receive(JSON.parse(notification.payload ?? '') as CommandNotification);
    } catch (error) {
      this.logger.warn(`Command notification not handled: ${(error as Error).message}`);
    }
  }

  private lost(error: Error): void {
    if (this.isStopping) {
      return;
    }
    this.logger.warn(`Command listener lost: ${error.message}; reconnecting`);
    this.client = null;
    setTimeout(() => void this.connect(), CommandListener.RECONNECT_DELAY_MS).unref();
  }
}
