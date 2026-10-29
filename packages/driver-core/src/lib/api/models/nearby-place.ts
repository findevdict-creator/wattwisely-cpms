/** One charging site near the phone, from GET /v1/driver/places/nearby (module 35). */
export interface NearbyPlace {
  tenant_id: string;
  operator_name: string;
  site_id: string;
  site_name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** From the point the app sent. */
  distance_m: number;
  connector_count: number;
  /** Plugs that could start now. */
  available_count: number;
  is_private_site: boolean;
  /** The operator keeps a member record of this login. */
  is_member: boolean;
  currency: string | null;
  /** The lowest energy price, e.g. "0.3000". */
  from_energy_price_per_kwh: string | null;
  /** The plug a tap opens: a free one when there is one. */
  plug: { charger_identity: string; ocpp_connector_id: number } | null;
}
