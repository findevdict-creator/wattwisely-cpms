import { chargingSessions, SessionPaymentRule, SessionStartSource } from '@wattwisely/db';
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
  /** The transaction id a 2.0.1 charger chose (module 18); null on 1.6. */
  ocppTransactionRef: string | null;
  idTag: string;
  /** The driver and card behind the tag, when it was a registered card (module 13). */
  driverId: string | null;
  rfidCardId: string | null;
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
  /** A card hold was (or is to be) taken for it (modules 6, 19); the payment row is found by session id. */
  isPaid: boolean;
  /** How it was started and who pays (module 19); null on sessions from before. */
  startSource: SessionStartSource | null;
  paymentRule: SessionPaymentRule | null;
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
    ocppTransactionRef: chargingSessions.ocppTransactionRef,
    idTag: chargingSessions.idTag,
    driverId: chargingSessions.driverId,
    rfidCardId: chargingSessions.rfidCardId,
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
    startSource: chargingSessions.startSource,
    paymentRule: chargingSessions.paymentRule,
  };
}
