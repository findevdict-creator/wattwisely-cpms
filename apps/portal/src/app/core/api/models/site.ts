/** A postal address as the API stores it. */
export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  region?: string;
  country: string;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** One opening period, "HH:MM" to "HH:MM" (24:00 for midnight at the end). */
export interface OpeningPeriod {
  opens: string;
  closes: string;
}

/** Opening periods per weekday. A day left out is closed; null as a whole means open 24 hours. */
export type OpeningHours = Partial<Record<Weekday, OpeningPeriod[]>>;

export type SiteVisibility = 'public' | 'private';
export type SiteStatus = 'ok' | 'problem' | 'offline';

/** GET /v1/sites: a charging location and how its chargers are doing. */
export interface Site {
  id: string;
  name: string;
  address: SiteAddress;
  latitude: number;
  longitude: number;
  time_zone: string;
  opening_hours: OpeningHours | null;
  visibility: SiteVisibility;
  power_limit_kw: number | null;
  parking_notes: string;
  /** The tariff new sessions are priced with; null: sessions here are not priced. */
  tariff_id: string | null;
  status: SiteStatus;
  charger_count: number;
  connector_count: number;
  available_connector_count: number;
  connector_counts: Record<string, number>;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Body of POST /v1/sites; PATCH sends any subset (null clears opening_hours or power_limit_kw). */
export interface SiteInput {
  name: string;
  address: SiteAddress;
  latitude: number;
  longitude: number;
  time_zone: string;
  opening_hours?: OpeningHours | null;
  visibility: SiteVisibility;
  power_limit_kw?: number | null;
  parking_notes?: string;
  tariff_id?: string | null;
}

/** One page of GET /v1/sites. */
export interface SitePage {
  items: Site[];
  next_cursor: string | null;
}
