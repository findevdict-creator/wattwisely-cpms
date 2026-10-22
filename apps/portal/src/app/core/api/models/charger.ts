import { SiteVisibility } from './site';

export type ChargerStatus =
  'waiting' | 'offline' | 'faulted' | 'charging' | 'available' | 'unavailable';
export type ChargerAuthMode = 'password' | 'none';
export type ConnectorType =
  'ccs1' | 'ccs2' | 'type1' | 'type2' | 'chademo' | 'gbt' | 'nacs' | 'unknown';

/** The session on a connector right now: running, or stopped while the car is still plugged in. */
export interface ActiveSession {
  id: string;
  ocpp_transaction_id: number | null;
  status: 'charging' | 'suspended' | 'idle' | 'stopping';
  started_at: string;
  energy_wh: number;
  /** The cost so far in minor units; null without a tariff or before the first estimate. */
  gross_amount: number | null;
  currency: string | null;
}

/** A plug on a charger, with the last status the charger reported for it. */
export interface Connector {
  id: string;
  charger_id: string;
  ocpp_connector_id: number;
  evse_id: number | null;
  type: ConnectorType;
  current_type: 'ac' | 'dc' | null;
  max_power_kw: number | null;
  label: string;
  status: string;
  error_code: string | null;
  status_info: string | null;
  status_changed_at: string | null;
  active_session: ActiveSession | null;
  version: number;
}

/** GET /v1/chargers: a registered charge point with its connectors. */
export interface Charger {
  id: string;
  site_id: string;
  site_name: string;
  ocpp_identity: string;
  vendor: string | null;
  model: string | null;
  auth_mode: ChargerAuthMode;
  allow_plain_ws: boolean;
  visibility_override: SiteVisibility | null;
  visibility: SiteVisibility;
  status: ChargerStatus;
  /** True while a gateway holds the charger's socket. */
  is_online: boolean;
  connected_at: string | null;
  ocpp_version: '1.6' | '2.0.1' | null;
  charge_point_serial: string | null;
  charge_box_serial: string | null;
  firmware_version: string | null;
  boot_fingerprint: { vendor: string; model: string; serial: string } | null;
  registration_status: 'accepted' | 'pending' | 'rejected' | null;
  last_boot_at: string | null;
  last_seen_at: string | null;
  connectors: Connector[];
  version: number;
  created_at: string;
  updated_at: string;
}

/** What to type into the charger. The password is only ever in this answer. */
export interface ChargerSetupCard {
  ocpp_url: string;
  ocpp_plain_url: string | null;
  identity: string;
  password: string | null;
}

export interface RegisteredCharger {
  charger: Charger;
  setup: ChargerSetupCard;
}

/** Body of POST /v1/chargers. */
export interface RegisterChargerInput {
  site_id: string;
  identity_mode: 'generate' | 'existing';
  identity?: string;
  auth_mode: ChargerAuthMode;
  vendor?: string;
  model?: string;
  allow_plain_ws: boolean;
}

/** Body of PATCH /v1/chargers/{id}. */
export interface ChargerChanges {
  site_id?: string;
  vendor?: string | null;
  model?: string | null;
  visibility_override?: SiteVisibility | null;
  allow_plain_ws?: boolean;
}

/** Body of POST /v1/chargers/{id}/connectors and PATCH /v1/connectors/{id}. */
export interface ConnectorInput {
  ocpp_connector_id?: number;
  evse_id?: number | null;
  type?: ConnectorType;
  current_type?: 'ac' | 'dc' | null;
  max_power_kw?: number | null;
  label?: string;
}

export interface ChargerPage {
  items: Charger[];
  next_cursor: string | null;
}

/** Filters of GET /v1/chargers. */
export interface ChargerFilter {
  site_id?: string;
  status?: ChargerStatus[];
  q?: string;
}
