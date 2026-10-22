import { SiteRecord } from './site-record';

/** The part of a site worth keeping in the audit log's before and after. */
export class SiteSnapshot {
  static of(site: SiteRecord | null): object | null {
    if (!site) {
      return null;
    }
    return {
      name: site.name,
      address: site.address,
      latitude: site.latitude,
      longitude: site.longitude,
      time_zone: site.timeZone,
      opening_hours: site.openingHours,
      visibility: site.visibility,
      power_limit_kw: site.powerLimitKw,
      parking_notes: site.parkingNotes,
    };
  }
}
