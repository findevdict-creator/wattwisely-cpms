import { OpeningHours, SiteAddress } from '@wattwisely/db';

/** One sites row as the repository returns it. */
export interface SiteRecord {
  id: string;
  name: string;
  address: SiteAddress;
  latitude: number;
  longitude: number;
  timeZone: string;
  openingHours: OpeningHours | null;
  visibility: 'public' | 'private';
  powerLimitKw: number | null;
  parkingNotes: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** How the site's chargers and connectors are doing right now, for the list and the site page. */
export interface SiteFleet {
  chargerCount: number;
  /** Chargers by derived status (waiting, offline, faulted, charging, available, unavailable). */
  chargerStatuses: Record<string, number>;
  /** Connectors by reported status. */
  connectorStatuses: Record<string, number>;
}

/** A site with its fleet summary, as the API shows it. */
export interface SiteSummary extends SiteRecord {
  fleet: SiteFleet;
}
