import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerEventPublisher } from '../events/charger-event.publisher';
import { ChargerIdentity } from '../storage/charger-identity';
import { GatewayConnectorsRepository } from '../storage/gateway-connectors.repository';
import { ChargerConnection } from './charger-connection';

/** The live events a connection's coming and going produce. Failures are logged, never thrown at the socket. */
@Injectable()
export class ConnectionEvents {
  private readonly logger = new Logger(ConnectionEvents.name);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly publisher: ChargerEventPublisher,
    private readonly connectors: GatewayConnectorsRepository,
  ) {}

  connected(connection: ChargerConnection): Promise<void> {
    return this.safely(connection.charger, (tx) =>
      this.publisher.publish(tx, connection.charger, 'charger.connected', {
        remote_ip: connection.remoteIp,
      }),
    );
  }

  disconnected(connection: ChargerConnection): Promise<void> {
    return this.safely(connection.charger, (tx) =>
      this.publisher.publish(tx, connection.charger, 'charger.disconnected'),
    );
  }

  /** After the grace period with no reconnect: every connector shows unavailable. */
  connectorsUnavailable(charger: ChargerIdentity): Promise<void> {
    return this.safely(charger, async (tx) => {
      const changed = await this.connectors.markAllUnavailable(tx, charger.id, 'Charger offline');
      for (const connector of changed) {
        await this.publisher.publish(tx, charger, 'connector.status', {
          connector_id: connector.id,
          ocpp_connector_id: connector.ocppConnectorId,
          status: 'unavailable',
          error_code: null,
        });
      }
    });
  }

  private async safely(
    charger: ChargerIdentity,
    work: Parameters<TransactionRunner['run']>[1],
  ): Promise<void> {
    try {
      await this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), work);
    } catch (error) {
      this.logger.warn(`Event for ${charger.identity} not recorded: ${(error as Error).message}`);
    }
  }
}
