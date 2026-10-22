import { SiteFleet } from './site-record';

/** The one-word state of a site shown on the list (API Design, "Sites": ok, problem, offline). */
export type SiteStatus = 'ok' | 'problem' | 'offline';

/**
 * Sums up a site's chargers in one word. A site with no chargers, or only chargers waiting
 * for their first connection, is fine. Every charger silent means the site is offline;
 * one charger faulted or silent among working ones is a problem.
 */
export class SiteHealth {
  static readonly PROBLEM_STATUSES = ['faulted', 'offline'];

  static statusOf(fleet: SiteFleet): SiteStatus {
    const connected = fleet.chargerCount - (fleet.chargerStatuses['waiting'] ?? 0);
    const offline = fleet.chargerStatuses['offline'] ?? 0;
    if (connected > 0 && offline === connected) {
      return 'offline';
    }
    const problems = SiteHealth.PROBLEM_STATUSES.reduce(
      (sum, status) => sum + (fleet.chargerStatuses[status] ?? 0),
      0,
    );
    return problems > 0 ? 'problem' : 'ok';
  }

  /** Connectors a driver could plug into right now. */
  static availableConnectors(fleet: SiteFleet): number {
    return fleet.connectorStatuses['available'] ?? 0;
  }

  static connectorCount(fleet: SiteFleet): number {
    return Object.values(fleet.connectorStatuses).reduce((sum, count) => sum + count, 0);
  }
}
