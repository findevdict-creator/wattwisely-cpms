/** The charging session running on a connector right now, as the gateway recorded it. */
export interface ActiveSession {
  id: string;
  ocppTransactionId: number;
  /** ISO 8601, as Postgres' json_build_object writes a timestamptz. */
  startedAt: string;
  energyWh: number;
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
