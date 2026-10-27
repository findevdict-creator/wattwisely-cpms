/** Revenue in one currency, in minor units. */
export interface Revenue {
  currency: string;
  amount: number;
}

/** One site or charger of the usage report, or the totals. */
export interface UsageRow {
  id: string | null;
  name: string;
  site_name: string;
  chargers: number;
  connectors: number;
  sessions: number;
  energy_wh: number;
  revenue: Revenue[];
  occupied_seconds: number;
  offline_seconds: number;
  utilisation_percent: number;
  uptime_percent: number;
}

/** GET /v1/reports/usage. */
export interface UsageReport {
  from: string;
  to: string;
  group_by: 'site' | 'charger';
  rows: UsageRow[];
  totals: UsageRow;
}

/** What a usage report covers. */
export interface UsageQuery {
  from: string;
  to: string;
  group_by: 'site' | 'charger';
  site_id?: string;
}

/** GET /v1/reports/overview: the home page's numbers. */
export interface Overview {
  chargers: number;
  chargers_online: number;
  chargers_offline: number;
  connectors_faulted: number;
  sessions_active: number;
  alerts_open: number;
  sessions_24h: number;
  energy_wh_24h: number;
  revenue_24h: Revenue[];
  utilisation_percent_24h: number;
}

/** The kinds of background export. */
export type ExportKind = 'sessions' | 'usage' | 'audit_log';

/** A background export (story SES-04). */
export interface ReportExport {
  id: string;
  kind: ExportKind;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'expired';
  file_name: string;
  row_count: number | null;
  size_bytes: number | null;
  is_truncated: boolean;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  expires_at: string | null;
}

/** Body of POST /v1/reports/exports: the kind and the filters of the page it came from. */
export interface ExportRequest {
  kind: ExportKind;
  from?: string;
  to?: string;
  site_id?: string;
  charger_id?: string;
  status?: string;
  needs_review?: 'true';
  group_by?: 'site' | 'charger';
  action?: string;
  target_type?: string;
}

/** A scheduled usage report. */
export interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  group_by: 'site' | 'charger';
  site_id: string | null;
  site_name: string | null;
  recipients: string[];
  time_zone: string;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  version: number;
}

/** Body of POST and PUT /v1/reports/schedules. */
export interface ReportScheduleRequest {
  name: string;
  frequency: 'weekly' | 'monthly';
  group_by: 'site' | 'charger';
  site_id: string | null;
  recipients: string[];
  time_zone: string;
  is_active: boolean;
}
