import { Injectable, Logger } from '@nestjs/common';
import { RemoteStartPayload } from '@wattwisely/ocpp-contracts';
import { ChargerConnection } from '../connection/charger-connection';
import { GatewayCommand } from '../storage/gateway-commands.repository';
import { CommandSender } from './command-sender';
import { CommandStore } from './command-store';
import { IssuedTagRegistry } from './issued-tag.registry';

/**
 * Sends one command to a connected charger and records what came of it. Commands to
 * one charger go out one at a time, because chargers drop overlapping calls; the row
 * moves queued → sent → a final state, and command.result reaches the live streams.
 */
@Injectable()
export class CommandDispatcher {
  private readonly logger = new Logger(CommandDispatcher.name);

  constructor(
    private readonly store: CommandStore,
    private readonly tags: IssuedTagRegistry,
    private readonly sender: CommandSender,
  ) {}

  dispatch(connection: ChargerConnection, command: GatewayCommand): Promise<void> {
    return connection.serialize(async () => {
      if (!(await this.store.claim(command))) {
        return; // Another path (an earlier flush, the API's expiry) already took it.
      }
      const outcome = await this.sender.send(connection, command);
      this.logger.log(`${command.action} to ${connection.charger.identity}: ${outcome.status}`);
      if (command.action === 'remote_start' && outcome.status === 'accepted') {
        const start = command.payload as RemoteStartPayload;
        this.tags.issue(command.chargerId, start.id_tag, command.id);
      }
      await this.store.complete(connection.charger, command, outcome);
    });
  }
}
