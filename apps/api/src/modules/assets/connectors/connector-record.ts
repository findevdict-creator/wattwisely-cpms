/**
 * The session on a connector right now (charging, suspended, idle, or stopping until
 * the car leaves), as the gateway recorded it, with its cost so far.
 */
export interface ActiveSession {
  id: string;
  ocppTransactionId: number;
  status: string;
  /** ISO 8601, as Postgres' json_build_object writes a timestamptz. */
  startedAt: string;
  energyWh: number;
  /** Minor units; null when the site has no tariff or the worker has not priced it yet. */
  grossAmount: number | null;
  currency: string | null;
}

/** One connectors row as the repository returns it. */
export interface ConnectorRecord {
  id: string;
  chargerId: string;
  ocppConnectorId: number;
  evseId: number | null;
  type: 'ccs1' | 'ccs2' | 'type1' | 'type2' | 'chademo' | 'gbt' | 'nacs' | 'unknown';
  currentType: 'ac' | 'dc' | null;
  maxPowerKw: number | null;
  label: string;
  status: string;
  errorCode: string | null;
  statusInfo: string | null;
  statusChangedAt: Date | null;
  version: number;
  activeSession: ActiveSession | null;
}
