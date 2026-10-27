import { ConnectorStatus } from './ocpp16-status';

/**
 * OCPP 2.0.1 splits what 1.6 said in one word. StatusNotification carries the connector's
 * ConnectorStatusEnum (five words: a plug is occupied, not why); TransactionEvent carries
 * the ChargingStateEnum, which says what the car on it is doing. The platform keeps 1.6's
 * finer connector statuses, so both are translated into them.
 */
export class Ocpp201Status {
  static readonly CONNECTOR: Record<string, ConnectorStatus> = {
    Available: 'available',
    Occupied: 'occupied',
    Reserved: 'reserved',
    Unavailable: 'unavailable',
    Faulted: 'faulted',
  };

  /** A charging state as the connector status it implies; EVConnected depends on whether the charge is over. */
  static readonly CHARGING_STATE: Record<string, ConnectorStatus> = {
    Charging: 'charging',
    SuspendedEV: 'suspended_ev',
    SuspendedEVSE: 'suspended_evse',
  };

  static toConnectorStatus(connectorStatus: string): ConnectorStatus {
    return Ocpp201Status.CONNECTOR[connectorStatus] ?? 'unknown';
  }

  /**
   * The connector status a transaction's charging state stands for, or null when it says
   * nothing about the plug (Idle: the cable is out, StatusNotification will say so).
   */
  static fromChargingState(chargingState: string, isEnded: boolean): ConnectorStatus | null {
    if (chargingState === 'EVConnected') {
      return isEnded ? 'finishing' : 'preparing';
    }
    return Ocpp201Status.CHARGING_STATE[chargingState] ?? null;
  }
}
