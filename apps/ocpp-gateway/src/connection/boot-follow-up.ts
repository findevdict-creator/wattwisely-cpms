import { Injectable, Logger } from '@nestjs/common';
import { OfflineCommandQueue } from '../commands/offline-command-queue';
import { GatewayConfig } from '../config/gateway.config';
import { ChargerConnection } from './charger-connection';
import { LeaseKeeper } from './lease-keeper';

/**
 * What follows a boot verdict (or a reconnect of an already accepted charger): a booted
 * charger's lease says so and its waiting commands go out; a rejected one is cut off.
 */
@Injectable()
export class BootFollowUp {
  static readonly POLICY_VIOLATION = 1008;

  private readonly logger = new Logger(BootFollowUp.name);

  constructor(
    private readonly lease: LeaseKeeper,
    private readonly queue: OfflineCommandQueue,
    private readonly config: GatewayConfig,
  ) {}

  async accepted(connection: ChargerConnection): Promise<void> {
    try {
      await this.lease.markBooted(connection);
      await this.queue.flush(connection);
    } catch (error) {
      this.logger.warn(`After boot of ${connection.charger.identity}: ${(error as Error).message}`);
    }
  }

  rejected(connection: ChargerConnection): void {
    this.logger.warn(
      `Boot of ${connection.charger.identity} rejected; closing in ${this.config.rejectCloseDelayMs} ms`,
    );
    setTimeout(
      () => connection.close(BootFollowUp.POLICY_VIOLATION, 'BootNotification rejected'),
      this.config.rejectCloseDelayMs,
    ).unref();
  }
}
