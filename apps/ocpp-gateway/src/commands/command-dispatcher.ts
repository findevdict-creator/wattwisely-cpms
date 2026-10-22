import { Injectable, Logger } from '@nestjs/common';
import { RemoteStartPayload } from '@wattwisely/ocpp-contracts';
import { CommandOutcome, V16CommandBuilder } from '../adapters/v16/v16-command.builder';
import { GatewayConfig } from '../config/gateway.config';
import { ChargerConnection } from '../connection/charger-connection';
import { MessageLogWriter } from '../log/message-log.writer';
import { GatewayCommand } from '../storage/gateway-commands.repository';
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
    private readonly log: MessageLogWriter,
    private readonly config: GatewayConfig,
  ) {}

  dispatch(connection: ChargerConnection, command: GatewayCommand): Promise<void> {
    return connection.serialize(async () => {
      if (!(await this.store.claim(command))) {
        return; // Another path (an earlier flush, the API's expiry) already took it.
      }
      const outcome = await this.send(connection, command);
      this.logger.log(`${command.action} to ${connection.charger.identity}: ${outcome.status}`);
      if (command.action === 'remote_start' && outcome.status === 'accepted') {
        const start = command.payload as RemoteStartPayload;
        this.tags.issue(command.chargerId, start.id_tag, command.id);
      }
      await this.store.complete(connection.charger, command, outcome);
    });
  }

  private async send(
    connection: ChargerConnection,
    command: GatewayCommand,
  ): Promise<CommandOutcome> {
    const { action, payload } = V16CommandBuilder.toCall(command);
    const { id, reply } = connection.call(action, payload, this.config.commandTimeoutMs);
    this.log.record({
      tenantId: command.tenantId,
      chargerId: command.chargerId,
      direction: 'out',
      messageType: 'call',
      messageId: id,
      action,
      payload,
      errorCode: null,
      receivedAt: new Date(),
    });
    return V16CommandBuilder.toOutcome(await reply);
  }
}
