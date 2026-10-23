/** One charger's month in the service report. */
export interface ServiceReportCharger {
  charger_id: string;
  ocpp_identity: string;
  site_name: string;
  sessions: number;
  /** kWh with three decimals, as text. */
  energy_kwh: string;
  /** Gross amount in minor units. */
  revenue: number;
  boots: number;
  faults: number;
}

/** A tariff change in the month, from the audit log. */
export interface ServiceReportTariffChange {
  action: string;
  tariff_name: string | null;
  occurred_at: string;
  actor_label: string;
  is_by_wattwisely: boolean;
}

/** GET /v1/managed-service/report: what Wattwisely did and what the chargers earned in a month. */
export interface ServiceReport {
  month: string;
  tenant_id: string;
  generated_at: string;
  is_complete: boolean;
  currency: string | null;
  chargers: ServiceReportCharger[];
  totals: { sessions: number; energy_kwh: string; revenue: number; faults: number };
  refunds: { count: number; total: number };
  tariff_changes: ServiceReportTariffChange[];
  actions_by_wattwisely: number;
  limitations: string[];
}
