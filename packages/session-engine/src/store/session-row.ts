import { chargingSessions } from '@wattwisely/db';
import { SessionState } from '../state/session-state';

/** A charging_sessions row as the session engine works with it. */
export interface SessionRow {
  id: string;
  tenantId: string;
  siteId: string;
  chargerId: string;
  connectorId: string;
  /** Empty until the charger starts the transaction (a paid session waits for it). */
  ocppTransactionId: number | null;
  idTag: string;
  status: SessionState;
  timeZone: string;
  startedAt: Date;
  endedAt: Date | null;
  unpluggedAt: Date | null;
  meterStartWh: number | null;
  meterStopWh: number | null;
  energyWh: number;
  energyIncreasedAt: Date | null;
  lastEventAt: Date;
  tariffVersionId: string | null;
  currency: string | null;
  grossAmount: number | null;
  commandId: string | null;
  /** A card hold was taken for it (module 6); the payment row is found by session id. */
  isPaid: boolean;
}

/** The columns every session read selects, so each one returns a full SessionRow. */
export class SessionColumns {
  static readonly SELECT = {
    id: chargingSessions.id,
    tenantId: chargingSessions.tenantId,
    siteId: chargingSessions.siteId,
    chargerId: chargingSessions.chargerId,
    connectorId: chargingSessions.connectorId,
    ocppTransactionId: chargingSessions.ocppTransactionId,
    idTag: chargingSessions.idTag,
    status: chargingSessions.status,
    timeZone: chargingSessions.timeZone,
    startedAt: chargingSessions.startedAt,
    endedAt: chargingSessions.endedAt,
    unpluggedAt: chargingSessions.unpluggedAt,
    meterStartWh: chargingSessions.meterStartWh,
    meterStopWh: chargingSessions.meterStopWh,
    energyWh: chargingSessions.energyWh,
    energyIncreasedAt: chargingSessions.energyIncreasedAt,
    lastEventAt: chargingSessions.lastEventAt,
    tariffVersionId: chargingSessions.tariffVersionId,
    currency: chargingSessions.currency,
    grossAmount: chargingSessions.grossAmount,
    commandId: chargingSessions.commandId,
    isPaid: chargingSessions.isPaid,
  };
}
