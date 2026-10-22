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
  ocppTransactionId: number;
  idTag: string;
  timeZone: string;
  startedAt: Date;
  endedAt: Date | null;
  unpluggedAt: Date | null;
  closedAt: Date | null;
  meterStartWh: number;
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
