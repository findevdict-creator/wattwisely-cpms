/** One charger's figures for the month. */
export interface ChargerReportRow {
  chargerId: string;
  ocppIdentity: string;
  siteName: string;
  sessions: number;
  energyWh: number;
  revenue: number;
  boots: number;
  faults: number;
}

/** A tariff change the audit log recorded in the month. */
export interface TariffChangeRow {
  action: string;
  targetLabel: string | null;
  occurredAt: Date;
  actorLabel: string;
  actorType: string;
}

/** Everything the service report shows, as the repository gathers it. */
export interface ServiceReportData {
  tenantId: string;
  currency: string | null;
  chargers: ChargerReportRow[];
  refunds: { count: number; total: number };
  tariffChanges: TariffChangeRow[];
  actionsByWattwisely: number;
}
