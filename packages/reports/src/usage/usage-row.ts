/** Revenue in one currency, in minor units: a tenant can price sites in more than one. */
export interface UsageRevenue {
  currency: string;
  amount: number;
}

/**
 * One site or charger in a usage report. Utilisation is the share of connector time a car
 * was plugged in; uptime is the share of charger time the charger was online, counted
 * from its offline alerts.
 */
export interface UsageRow {
  id: string;
  name: string;
  siteName: string;
  chargers: number;
  connectors: number;
  sessions: number;
  energyWh: number;
  revenue: UsageRevenue[];
  occupiedSeconds: number;
  offlineSeconds: number;
  utilisationPercent: number;
  uptimePercent: number;
}

/** The report: its rows and the same figures over all of them. */
export interface UsageReport {
  from: Date;
  to: Date;
  groupBy: 'site' | 'charger';
  rows: UsageRow[];
  totals: Omit<UsageRow, 'id' | 'name' | 'siteName'>;
}
