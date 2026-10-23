import { Injectable, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { GatewayMetrics } from '../metrics/gateway-metrics';
import { AcceptedUpgrade } from './accepted-upgrade';
import { ConnectionOpener } from './connection-opener';
import { UpgradeGuard } from './upgrade-guard';
import { UpgradeRefusal } from './upgrade-refusal';
import { UpgradeRequest } from './upgrade-request';

/**
 * The /ocpp/<identity> route: the checks run as a Fastify preHandler, so a refused
 * charger gets a plain HTTP answer and never a socket; an accepted one is handed to
 * the connection opener once the upgrade is done.
 */
@Injectable()
export class OcppRoute {
  private readonly logger = new Logger(OcppRoute.name);
  private readonly accepted = new WeakMap<FastifyRequest, AcceptedUpgrade>();

  constructor(
    private readonly guard: UpgradeGuard,
    private readonly opener: ConnectionOpener,
    private readonly metrics: GatewayMetrics,
  ) {}

  async preHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const upgrade = UpgradeRequest.from(request);
    try {
      this.accepted.set(request, await this.guard.check(upgrade));
      this.metrics.upgrade('accepted');
    } catch (error) {
      this.metrics.upgrade(error instanceof UpgradeRefusal ? error.reason : 'internal_error');
      if (error instanceof UpgradeRefusal) {
        this.logger.warn(`Refused ${upgrade.identity} from ${upgrade.ip}: ${error.message}`);
        await reply.code(error.status).headers(error.headers).send({ error: error.reason });
        return;
      }
      this.logger.error(
        `Upgrade check failed for ${upgrade.identity}: ${(error as Error).message}`,
      );
      await reply.code(500).send({ error: 'internal_error' });
    }
  }

  accept(socket: WebSocket, request: FastifyRequest): void {
    const accepted = this.accepted.get(request);
    if (!accepted) {
      socket.close(1011, 'Upgrade was not checked');
      return;
    }
    this.opener.open(socket, accepted);
  }
}
