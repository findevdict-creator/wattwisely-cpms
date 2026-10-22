import { ReceiptLine } from './tariff';

export type SessionState =
  | 'authorising'
  | 'starting'
  | 'charging'
  | 'suspended'
  | 'idle'
  | 'stopping'
  | 'completed'
  | 'not_started'
  | 'failed';

/** GET /v1/sessions: one charging session. Amounts are minor units of `currency`. */
export interface Session {
  id: string;
  status: SessionState;
  site_id: string;
  site_name: string;
  charger_id: string;
  charger_identity: string;
  connector_id: string;
  connector_label: string;
  id_tag: string;
  started_at: string;
  ended_at: string | null;
  unplugged_at: string | null;
  energy_wh: number;
  currency: string | null;
  net_amount: number | null;
  tax_amount: number | null;
  gross_amount: number | null;
  is_priced: boolean;
  review_flags: string[];
  failure_reason: string | null;
}

/** One step of a session's timeline. */
export interface SessionStateChange {
  from_status: SessionState | null;
  to_status: SessionState;
  event: string;
  occurred_at: string;
  details: Record<string, unknown>;
}

/** GET /v1/sessions/{id}: the session with its receipt and timeline. */
export interface SessionDetail extends Session {
  ocpp_transaction_id: number;
  ocpp_connector_id: number;
  time_zone: string;
  closed_at: string | null;
  meter_start_wh: number;
  meter_stop_wh: number | null;
  stop_reason: string | null;
  tariff: { id: string; name: string; version_number: number } | null;
  priced_at: string | null;
  pricing_engine_version: string | null;
  pricing_input_hash: string | null;
  lines: ReceiptLine[];
  state_changes: SessionStateChange[];
}

/** One point of the energy chart. */
export interface SessionReading {
  at: string;
  energy_wh: number | null;
  power_w: number | null;
  soc_percent: number | null;
}

export interface SessionPage {
  items: Session[];
  next_cursor: string | null;
}

/** The filters of the sessions list. */
export interface SessionFilter {
  site_id?: string;
  charger_id?: string;
  status?: string;
  from?: string;
  to?: string;
  needs_review?: 'true';
}
