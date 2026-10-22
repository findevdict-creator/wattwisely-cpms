import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { GatewayConfig } from '../config/gateway.config';
import { MessagePipeline } from '../transport/message-pipeline';
import { AcceptedUpgrade } from './accepted-upgrade';
import { ChargerConnection } from './charger-connection';
import { ConnectionLifecycle } from './connection-lifecycle';

/** Turns an accepted upgrade into a connection and wires the socket to the message pipeline. */
@Injectable()
export class ConnectionOpener {
  private readonly logger = new Logger(ConnectionOpener.name);

  constructor(
    private readonly lifecycle: ConnectionLifecycle,
    private readonly pipeline: MessagePipeline,
    private readonly config: GatewayConfig,
  ) {}

  open(socket: WebSocket, accepted: AcceptedUpgrade): ChargerConnection {
    const connection = new ChargerConnection(socket, accepted, this.config.heartbeatIntervalS);
    socket.on('message', (data) => void this.pipeline.handle(connection, data.toString()));
    socket.on('close', () => void this.lifecycle.closed(connection));
    socket.on('error', (error) =>
      this.logger.warn(`Socket error for ${accepted.charger.identity}: ${error.message}`),
    );
    this.logger.log(`${accepted.charger.identity} connected from ${accepted.remoteIp}`);
    void this.lifecycle.opened(connection);
    return connection;
  }
}
