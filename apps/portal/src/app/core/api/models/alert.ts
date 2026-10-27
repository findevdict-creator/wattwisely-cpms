/** The problems the platform raises alerts for (story NTF-04). */
export type AlertType =
  'charger_offline' | 'connector_faulted' | 'session_stuck' | 'start_failures' | 'reset_no_return';

/** Open until someone acknowledges it; closed when the problem clears. */
export type AlertStatus = 'open' | 'acknowledged' | 'closed';

/** One alert from GET /v1/alerts. */
export interface Alert {
  id: string;
  type: AlertType;
  status: AlertStatus;
  title: string;
  details: Record<string, unknown>;
  site_id: string;
  site_name: string;
  charger_id: string;
  charger_identity: string;
  connector_id: string | null;
  session_id: string | null;
  began_at: string;
  opened_at: string;
  last_seen_at: string;
  occurrences: number;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledge_note: string;
  closed_at: string | null;
  close_reason: string | null;
  version: number;
}

/** One page of GET /v1/alerts, newest first. */
export interface AlertPage {
  items: Alert[];
  next_cursor: string | null;
}

/** GET /v1/alerts/summary: the badge on the Alerts link. */
export interface AlertSummary {
  open: number;
  acknowledged: number;
}

/** One routing rule (story NTF-03): a role or one person, at one site or all of them. */
export interface AlertRule {
  id?: string;
  alert_type: AlertType;
  site_id: string | null;
  site_name?: string | null;
  role_id: string | null;
  role_name?: string | null;
  membership_id: string | null;
  member_name?: string | null;
  is_email: boolean;
  is_in_portal: boolean;
}

/** GET /v1/alert-rules. */
export interface AlertRules {
  rules: AlertRule[];
  default_rules: { role_name: string; is_email: boolean; is_in_portal: boolean }[];
}

/** The words for each alert type. */
export class AlertTypeLabels {
  static readonly LABELS: Record<AlertType, string> = {
    charger_offline: 'Charger offline',
    connector_faulted: 'Connector faulted',
    session_stuck: 'Session stuck',
    start_failures: 'Repeated start failures',
    reset_no_return: 'No return after reset',
  };
  static readonly TYPES = Object.keys(AlertTypeLabels.LABELS) as AlertType[];
}
