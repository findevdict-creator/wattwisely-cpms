import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { Ocpp16Status } from '@wattwisely/ocpp-contracts';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { ConnectorSessionEffects } from '../../sessions/connector-session-effects';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';
import { StatusNotificationRequest } from './v16-messages';

/**
 * StatusNotification: the connector's new state, stored on the connector (created on the
 * spot if the portal does not know it yet) and pushed to the live stream, then applied
 * to the session on the connector (paused, idle, resumed, or unplugged). Connector 0
 * is the charger as a whole; it is logged but changes no connector.
 */
@Injectable()
export class V16StatusNotificationHandler implements ActionHandler {
  readonly action = 'StatusNotification';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
    private readonly sessionEffects: ConnectorSessionEffects,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const status = payload as StatusNotificationRequest;
    await this.transactionRunner.run(
      DatabaseSession.forTenant(connection.charger.tenantId),
      async (tx) => {
        await this.store.chargers.touch(tx, connection.charger.id);
        if (status.connectorId >= 1) {
          await this.apply(tx, connection, status);
        }
      },
    );
    return { reply: {} };
  }

  private async apply(
    tx: Transaction,
    connection: ChargerConnection,
    status: StatusNotificationRequest,
  ) {
    const charger = connection.charger;
    const connector = await this.store.connectors.findOrCreate(tx, charger, status.connectorId);
    const connectorStatus = Ocpp16Status.toConnectorStatus(status.status);
    const changedAt = status.timestamp ? new Date(status.timestamp) : new Date();
    await this.store.connectors.updateStatus(tx, connector.id, {
      status: connectorStatus,
      errorCode: status.errorCode === 'NoError' ? null : status.errorCode,
      vendorErrorCode: status.vendorErrorCode ?? null,
      statusInfo: status.info ?? null,
      changedAt,
    });
    await this.publisher.publish(tx, charger, 'connector.status', {
      connector_id: connector.id,
      ocpp_connector_id: connector.ocppConnectorId,
      status: connectorStatus,
      error_code: status.errorCode === 'NoError' ? null : status.errorCode,
      status_info: status.info ?? null,
    });
    await this.sessionEffects.apply(tx, connector.id, connectorStatus, changedAt);
  }
}
