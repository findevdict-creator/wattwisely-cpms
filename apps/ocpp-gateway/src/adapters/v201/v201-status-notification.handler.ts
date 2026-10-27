import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { Ocpp201Status } from '@wattwisely/ocpp-contracts';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { ConnectorSessionEffects } from '../../sessions/connector-session-effects';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';
import { StatusNotificationRequest201 } from './v201-messages';

/**
 * StatusNotification (2.0.1): one of five words for a cable on an EVSE. An EVSE is a plug
 * for the platform: its id is the connector number, stored in `evse_id` as well. The
 * status goes on the connector, created on the spot if the portal does not know it, and
 * to the live stream; "Available" means the car has left, which ends a session's idle
 * time. What the car is doing while the plug is "Occupied" comes with TransactionEvent.
 * An EVSE with two cables reports each; the latest report stands.
 */
@Injectable()
export class V201StatusNotificationHandler implements ActionHandler {
  readonly action = 'StatusNotification';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
    private readonly sessionEffects: ConnectorSessionEffects,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const status = payload as StatusNotificationRequest201;
    await this.transactionRunner.run(
      DatabaseSession.forTenant(connection.charger.tenantId),
      async (tx) => {
        await this.store.chargers.touch(tx, connection.charger.id);
        if (status.evseId >= 1) {
          await this.apply(tx, connection, status);
        }
      },
    );
    return { reply: {} };
  }

  private async apply(
    tx: Transaction,
    connection: ChargerConnection,
    status: StatusNotificationRequest201,
  ) {
    const charger = connection.charger;
    const connector = await this.store.connectors.findOrCreate(
      tx,
      charger,
      status.evseId,
      status.evseId,
    );
    const connectorStatus = Ocpp201Status.toConnectorStatus(status.connectorStatus);
    const changedAt = new Date(status.timestamp);
    await this.store.connectors.updateStatus(tx, connector.id, {
      status: connectorStatus,
      errorCode: null,
      vendorErrorCode: null,
      statusInfo: null,
      changedAt,
    });
    await this.publisher.publish(tx, charger, 'connector.status', {
      connector_id: connector.id,
      ocpp_connector_id: connector.ocppConnectorId,
      status: connectorStatus,
      error_code: null,
      status_info: null,
    });
    await this.sessionEffects.apply(tx, connector.id, connectorStatus, changedAt);
  }
}
