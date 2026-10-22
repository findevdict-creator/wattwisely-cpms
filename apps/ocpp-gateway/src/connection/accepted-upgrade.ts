import { ChargerIdentity } from '../storage/charger-identity';

/** What the checks established about a connection that may go ahead. */
export interface AcceptedUpgrade {
  charger: ChargerIdentity;
  /** Random per socket; the lease row carries it so a stale row never passes for a live one. */
  connectionId: string;
  remoteIp: string;
}
