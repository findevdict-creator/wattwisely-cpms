import { randomUUID } from 'node:crypto';
import websocket from '@fastify/websocket';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GatewayConfig } from './config/gateway.config';
import { GatewayConfigLoader } from './config/gateway-config.loader';
import { OcppRoute } from './connection/ocpp-route';

/**
 * Starts the gateway: a Fastify server with the WebSocket endpoint chargers connect to
 * (/ocpp/<identity>) and the health checks. Tests call `configure` on a test module so
 * they run the real upgrade path.
 */
export class GatewayServer {
  private readonly logger = new Logger(GatewayServer.name);

  async start(): Promise<void> {
    const config = new GatewayConfigLoader().load(process.env);
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      GatewayServer.createAdapter(config.isProxyTrusted),
    );
    await GatewayServer.configure(app);
    await app.listen(config.port, '0.0.0.0');
    this.logger.log(`OCPP gateway listening on port ${config.port} as ${config.instanceId}`);
  }

  static createAdapter(isProxyTrusted: boolean): FastifyAdapter {
    return new FastifyAdapter({
      logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
      trustProxy: isProxyTrusted,
      genReqId: () => randomUUID(),
    });
  }

  /** Registers the WebSocket plugin and the OCPP route. Call before `init` or `listen`. */
  static async configure(app: NestFastifyApplication): Promise<void> {
    const config = app.get(GatewayConfig);
    const route = app.get(OcppRoute);
    app.enableShutdownHooks();
    await app.register(websocket, {
      options: {
        maxPayload: config.maxFrameBytes,
        // The checks already picked the version from what the charger offered; this names it in the answer.
        handleProtocols: (_protocols, request) => route.subprotocolFor(request),
      },
    });
    app
      .getHttpAdapter()
      .getInstance()
      .get(
        '/ocpp/:identity',
        { websocket: true, preHandler: (request, reply) => route.preHandler(request, reply) },
        (socket, request) => route.accept(socket, request),
      );
  }
}
