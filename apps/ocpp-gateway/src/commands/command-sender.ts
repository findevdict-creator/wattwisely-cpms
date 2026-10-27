import { Injectable } from '@nestjs/common';
import { CommandTranslators } from '../adapters/command-translators';
import { GatewayConfig } from '../config/gateway.config';
import { ChargerConnection } from '../connection/charger-connection';
import { MessageLogWriter } from '../log/message-log.writer';
import { GatewayMetrics } from '../metrics/gateway-metrics';
import { GatewayCommand } from '../storage/gateway-commands.repository';
import { CommandOutcome } from './command-outcome';

/**
 * Sends one command as an OCPP CALL in the connection's version and waits for the
 * charger's answer, up to the command timeout: logs the CALL, and counts and times the
 * outcome for the monitoring (module 12).
 */
@Injectable()
export class CommandSender {
  constructor(
    private readonly translators: CommandTranslators,
    private readonly log: MessageLogWriter,
    private readonly config: GatewayConfig,
    private readonly metrics: GatewayMetrics,
  ) {}

  async send(connection: ChargerConnection, command: GatewayCommand): Promise<CommandOutcome> {
    const translator = this.translators.for(connection.version);
    const { action, payload } = await translator.toCall(command);
    const startedAt = performance.now();
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
    const outcome = translator.toOutcome(await reply);
    this.metrics.command(command.action, outcome.status, (performance.now() - startedAt) / 1000);
    return outcome;
  }
}
