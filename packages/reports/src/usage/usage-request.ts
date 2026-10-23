/** A usage report is one row per site, or one row per charger. */
export type UsageGrouping = 'site' | 'charger';

/** What a usage report covers (PRD, Reports): a period, a grouping and the caller's sites. */
export interface UsageRequest {
  /** Inclusive. */
  from: Date;
  /** Exclusive. A period reaching into the future is counted up to `now`. */
  to: Date;
  groupBy: UsageGrouping;
  /** The caller's site scope: null for the whole tenant. */
  siteIds: string[] | null;
  /** Only this site. */
  siteId?: string;
  now: Date;
}
