/** What one row of the sessions CSV needs from a session. */
export interface SessionCsvRow {
  id: string;
  status: string;
  siteName: string;
  chargerIdentity: string;
  connectorLabel: string;
  idTag: string;
  startedAt: Date;
  endedAt: Date | null;
  unpluggedAt: Date | null;
  energyWh: number;
  currency: string | null;
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  reviewFlags: string[];
  failureReason: string | null;
}
