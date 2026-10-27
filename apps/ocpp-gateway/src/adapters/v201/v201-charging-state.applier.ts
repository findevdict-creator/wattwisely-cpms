import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { Ocpp201Status } from '@wattwisely/ocpp-contracts';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { ConnectorSessionEffects } from '../../sessions/connector-session-effects';
import { ChargerIdentity } from '../../storage/charger-identity';
import { GatewayConnector } from '../../storage/gateway-connectors.repository';
import { GatewayRepositories } from '../../storage/gateway-repositories';

/**
 * A TransactionEvent's chargingState says what 1.6's StatusNotification used to: the car
 * is charging, has stopped drawing (SuspendedEV), is held back by the charger
 * (SuspendedEVSE), or is plugged in without charging. The connector takes that finer
 * status so the portal shows it, the live stream hears it, and the session on the plug
 * pauses, idles or resumes as in 1.6. Nothing happens when the event says nothing new.
 */
@Injectable()
export class V201ChargingStateApplier {
  constructor(
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
    private readonly sessionEffects: ConnectorSessionEffects,
  ) {}

  async apply(
    tx: Transaction,
    charger: ChargerIdentity,
    connector: GatewayConnector,
    state: { chargingState: string | undefined; isEnded: boolean; at: Date },
  ): Promise<void> {
    const status = state.chargingState
      ? Ocpp201Status.fromChargingState(state.chargingState, state.isEnded)
      : null;
    if (!status || status === connector.status) {
      return;
    }
    await this.store.connectors.updateStatus(tx, connector.id, {
      status,
      errorCode: null,
      vendorErrorCode: null,
      statusInfo: null,
      changedAt: state.at,
    });
    await this.publisher.publish(tx, charger, 'connector.status', {
      connector_id: connector.id,
      ocpp_connector_id: connector.ocppConnectorId,
      status,
      error_code: null,
      status_info: null,
    });
    await this.sessionEffects.apply(tx, connector.id, status, state.at);
  }
}
