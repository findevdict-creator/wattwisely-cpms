/**
 * Which sessions an export holds, as stored with a background export: the caller's site
 * scope (null for the whole tenant) and the list filters they had on screen.
 */
export interface SessionExportFilter {
  siteIds: string[] | null;
  siteId?: string;
  chargerId?: string;
  statuses?: string[];
  /** Started at or after (ISO 8601). */
  from?: string;
  /** Started before (ISO 8601). */
  to?: string;
  isReviewNeeded?: boolean;
}
