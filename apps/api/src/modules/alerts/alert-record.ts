import { AlertStatus, AlertType } from './alert-types';

/** One alert as the repository returns it, with the names the list shows. */
export interface AlertRecord {
  id: string;
  type: AlertType;
  status: AlertStatus;
  title: string;
  details: Record<string, unknown>;
  siteId: string;
  siteName: string;
  chargerId: string;
  chargerIdentity: string;
  connectorId: string | null;
  sessionId: string | null;
  beganAt: Date;
  openedAt: Date;
  lastSeenAt: Date;
  occurrences: number;
  acknowledgedByName: string | null;
  acknowledgedAt: Date | null;
  acknowledgeNote: string;
  closedAt: Date | null;
  closeReason: string | null;
  version: number;
}
