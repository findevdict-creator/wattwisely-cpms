import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GatewayConfig } from '../config/gateway.config';
import { ConnectionRegistry } from './connection-registry';

/** Closes the socket of any charger silent for more than 2.5 heartbeat intervals; the close marks it offline. */
@Injectable()
export class HeartbeatWatcher implements OnModuleInit, OnModuleDestroy {
  static readonly SILENT_AFTER_INTERVALS = 2.5;
  static readonly GOING_AWAY = 1001;

  private readonly logger = new Logger(HeartbeatWatcher.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly config: GatewayConfig,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.sweep(), this.config.watchIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  sweep(now: number = Date.now()): void {
    for (const connection of this.registry.all()) {
      const limitMs =
        HeartbeatWatcher.SILENT_AFTER_INTERVALS * connection.heartbeatIntervalS * 1000;
      if (now - connection.lastSeenAt > limitMs) {
        this.logger.warn(`${connection.charger.identity} silent for ${limitMs} ms; closing`);
        connection.close(HeartbeatWatcher.GOING_AWAY, 'No heartbeat');
      }
    }
  }
}
