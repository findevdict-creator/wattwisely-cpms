import { Injectable } from '@nestjs/common';
import { BootFollowUp } from './boot-follow-up';
import { ChargerConnection } from './charger-connection';
import { ConnectionEvents } from './connection-events';
import { ConnectionRegistry } from './connection-registry';
import { DisconnectHandler } from './disconnect-handler';

/**
 * A connection's first and last moments. On open it is registered and announced; a
 * charger that was already accepted and only lost its network picks up where it was,
 * commands included, without booting again. On close the disconnect handler takes over.
 */
@Injectable()
export class ConnectionLifecycle {
  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly events: ConnectionEvents,
    private readonly followUp: BootFollowUp,
    private readonly disconnects: DisconnectHandler,
  ) {}

  async opened(connection: ChargerConnection): Promise<void> {
    this.registry.add(connection);
    await this.events.connected(connection);
    if (connection.isBooted) {
      await this.followUp.accepted(connection);
    }
  }

  closed(connection: ChargerConnection): Promise<void> {
    return this.disconnects.handle(connection);
  }
}
