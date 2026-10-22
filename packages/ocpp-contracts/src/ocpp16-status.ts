/** The connector_status enum values, as the database stores them. */
export type ConnectorStatus =
  | 'available'
  | 'preparing'
  | 'charging'
  | 'suspended_ev'
  | 'suspended_evse'
  | 'finishing'
  | 'reserved'
  | 'occupied'
  | 'unavailable'
  | 'faulted'
  | 'unknown';

/** Translates OCPP 1.6 ChargePointStatus words into the platform's connector statuses. */
export class Ocpp16Status {
  static readonly CONNECTOR: Record<string, ConnectorStatus> = {
    Available: 'available',
    Preparing: 'preparing',
    Charging: 'charging',
    SuspendedEVSE: 'suspended_evse',
    SuspendedEV: 'suspended_ev',
    Finishing: 'finishing',
    Reserved: 'reserved',
    Unavailable: 'unavailable',
    Faulted: 'faulted',
  };

  static toConnectorStatus(chargePointStatus: string): ConnectorStatus {
    return Ocpp16Status.CONNECTOR[chargePointStatus] ?? 'unknown';
  }
}
