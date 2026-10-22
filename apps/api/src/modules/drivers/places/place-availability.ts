/** Whether a driver can start on a plug right now, in one word for the QR page. */
export type PlaceAvailability = 'available' | 'busy' | 'offline' | 'out_of_service' | 'faulted';

/** What the policy looks at: the charger's connection, the plug's last reported status, and sessions. */
export interface PlaceState {
  isOnline: boolean;
  connectorStatus: string;
  /** A session is running, or a paid one is being set up, on this plug. */
  isBusy: boolean;
}

/**
 * Turns what the platform knows about a plug into whether a driver may start there. A
 * plug the charger never reported counts as available: the charger is online, and the
 * start itself is refused if a session is already on it.
 */
export class PlaceAvailabilityPolicy {
  static readonly BUSY_STATUSES = [
    'charging',
    'suspended_ev',
    'suspended_evse',
    'finishing',
    'reserved',
    'occupied',
  ];

  static of(state: PlaceState): PlaceAvailability {
    if (!state.isOnline) {
      return 'offline';
    }
    if (state.connectorStatus === 'faulted') {
      return 'faulted';
    }
    if (state.connectorStatus === 'unavailable') {
      return 'out_of_service';
    }
    if (state.isBusy || PlaceAvailabilityPolicy.BUSY_STATUSES.includes(state.connectorStatus)) {
      return 'busy';
    }
    return 'available';
  }
}
