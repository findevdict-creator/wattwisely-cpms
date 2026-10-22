import { SessionState } from '@wattwisely/session-engine';

/** One charging_sessions row with the names of where it happened, as lists and details read it. */
export interface SessionRecord {
  id: string;
  status: SessionState;
  siteId: string;
  siteName: string;
  chargerId: string;
  chargerIdentity: string;
  connectorId: string;
  connectorLabel: string;
  ocppConnectorId: number;
  /** Empty while a paid session waits for the charger to start the transaction. */
  ocppTransactionId: number | null;
  idTag: string;
  timeZone: string;
  startedAt: Date;
  endedAt: Date | null;
  unpluggedAt: Date | null;
  closedAt: Date | null;
  meterStartWh: number | null;
  meterStopWh: number | null;
  energyWh: number;
  stopReason: string | null;
  failureReason: string | null;
  tariffVersionId: string | null;
  currency: string | null;
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  pricedAt: Date | null;
  pricingEngineVersion: string | null;
  pricingInputHash: string | null;
  reviewFlags: string[];
  /** The driver pays by card (module 6). */
  isPaid: boolean;
  /** Where the card payment stands, when there is one. */
  paymentStatus: string | null;
}

/** The tariff a session was priced with: its name and which version. */
export interface SessionTariff {
  tariffId: string;
  name: string;
  versionNumber: number;
}

/** One row of a session's history. */
export interface SessionStateChangeRecord {
  fromStatus: string | null;
  toStatus: string;
  event: string;
  occurredAt: Date;
  details: Record<string, unknown>;
}

/** One meter reading, as the energy chart reads it. */
export interface SessionReading {
  at: Date;
  energyWh: number | null;
  powerW: number | null;
  socPercent: number | null;
}
