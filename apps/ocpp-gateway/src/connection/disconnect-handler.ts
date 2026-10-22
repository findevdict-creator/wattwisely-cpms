import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../config/gateway.config';
import { ChargerConnection } from './charger-connection';
import { ConnectionEvents } from './connection-events';
import { ConnectionRegistry } from './connection-registry';
import { LeaseKeeper } from './lease-keeper';

/**
 * What happens when a socket closes: waiting calls are failed, the lease is dropped
 * (so the charger shows offline at once), charger.disconnected is published, and
 * after a grace period without a reconnect the connectors are marked unavailable.
 */
@Injectable()
export class DisconnectHandler {
  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly lease: LeaseKeeper,
    private readonly events: ConnectionEvents,
    private readonly config: GatewayConfig,
  ) {}

  async handle(connection: ChargerConnection): Promise<void> {
    connection.closed();
    if (!this.registry.remove(connection)) {
      return; // Already replaced by a newer socket of the same charger.
    }
    await this.lease.release(connection);
    await this.events.disconnected(connection);
    setTimeout(() => void this.afterGrace(connection), this.config.disconnectGraceMs).unref();
  }

  private async afterGrace(connection: ChargerConnection): Promise<void> {
    if (this.registry.find(connection.charger.id)) {
      return; // Back already: a quick reconnect must not flap the status.
    }
    await this.events.connectorsUnavailable(connection.charger);
  }
}
