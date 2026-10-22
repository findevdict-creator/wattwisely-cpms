import { Injectable, Logger } from '@nestjs/common';
import { ChargerConnection } from '../connection/charger-connection';
import { CommandDispatcher } from './command-dispatcher';
import { CommandStore } from './command-store';

/**
 * Commands the API queued while the charger was away (OCPP gateway design, "Offline
 * queue"). When the charger is back and booted they go out in order; those whose
 * five minutes ran out are expired instead.
 */
@Injectable()
export class OfflineCommandQueue {
  private readonly logger = new Logger(OfflineCommandQueue.name);

  constructor(
    private readonly store: CommandStore,
    private readonly dispatcher: CommandDispatcher,
  ) {}

  async flush(connection: ChargerConnection): Promise<void> {
    const commands = await this.store.takeQueued(connection.charger);
    if (commands.length > 0) {
      this.logger.log(`${commands.length} queued command(s) for ${connection.charger.identity}`);
    }
    for (const command of commands) {
      await this.dispatcher.dispatch(connection, command);
    }
  }
}
