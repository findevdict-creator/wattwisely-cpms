import { Transaction } from '@wattwisely/db';
import { UsageActivity, UsageActivityQuery, UsageRevenueRow } from './usage-activity.query';
import { UsageGroup, UsageGroupsQuery } from './usage-groups.query';
import { UsageRequest } from './usage-request';
import { UsageReport, UsageRevenue, UsageRow } from './usage-row';
import { UsageScope } from './usage-scope';

/**
 * Builds the usage, uptime and revenue report (PRD, Reports): sessions, energy, revenue,
 * utilisation and uptime per site or charger, and the totals. The portal's Reports page,
 * its CSV download, background exports and scheduled e-mails all use it.
 */
export class UsageReportBuilder {
  static async build(tx: Transaction, request: UsageRequest): Promise<UsageReport> {
    const groups = await UsageGroupsQuery.run(tx, request);
    const sessions = new Map(
      (await UsageActivityQuery.sessions(tx, request)).map((row) => [row.id, row]),
    );
    const revenue = UsageReportBuilder.byId(await UsageActivityQuery.revenue(tx, request));
    const offline = new Map(
      (await UsageActivityQuery.offline(tx, request)).map((row) => [row.id, row.offline_seconds]),
    );
    const seconds = UsageReportBuilder.periodSeconds(request);
    const rows = groups.map((group) =>
      UsageReportBuilder.row(group, sessions.get(group.id), revenue.get(group.id) ?? [], {
        offlineSeconds: offline.get(group.id) ?? 0,
        periodSeconds: seconds,
      }),
    );
    return {
      from: request.from,
      to: request.to,
      groupBy: request.groupBy,
      rows,
      totals: UsageReportBuilder.totals(rows, seconds),
    };
  }

  private static row(
    group: UsageGroup,
    activity: UsageActivity | undefined,
    revenue: UsageRevenue[],
    time: { offlineSeconds: number; periodSeconds: number },
  ): UsageRow {
    const occupied = activity?.occupied_seconds ?? 0;
    return {
      id: group.id,
      name: group.name,
      siteName: group.site_name,
      chargers: group.chargers,
      connectors: group.connectors,
      sessions: activity?.sessions ?? 0,
      energyWh: activity?.energy_wh ?? 0,
      revenue,
      occupiedSeconds: Math.round(occupied),
      offlineSeconds: Math.round(time.offlineSeconds),
      utilisationPercent: UsageReportBuilder.share(occupied, group.connectors * time.periodSeconds),
      uptimePercent: UsageReportBuilder.uptime(
        time.offlineSeconds,
        group.chargers * time.periodSeconds,
      ),
    };
  }

  private static totals(rows: UsageRow[], periodSeconds: number): UsageReport['totals'] {
    const sum = (pick: (row: UsageRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    const chargers = sum((row) => row.chargers);
    const connectors = sum((row) => row.connectors);
    const occupied = sum((row) => row.occupiedSeconds);
    const offline = sum((row) => row.offlineSeconds);
    return {
      chargers,
      connectors,
      sessions: sum((row) => row.sessions),
      energyWh: sum((row) => row.energyWh),
      revenue: UsageReportBuilder.addRevenue(rows.flatMap((row) => row.revenue)),
      occupiedSeconds: occupied,
      offlineSeconds: offline,
      utilisationPercent: UsageReportBuilder.share(occupied, connectors * periodSeconds),
      uptimePercent: UsageReportBuilder.uptime(offline, chargers * periodSeconds),
    };
  }

  private static byId(rows: UsageRevenueRow[]): Map<string, UsageRevenue[]> {
    const map = new Map<string, UsageRevenue[]>();
    for (const row of rows) {
      map.set(row.id, [...(map.get(row.id) ?? []), { currency: row.currency, amount: row.amount }]);
    }
    return map;
  }

  private static addRevenue(parts: UsageRevenue[]): UsageRevenue[] {
    const totals = new Map<string, number>();
    for (const part of parts) {
      totals.set(part.currency, (totals.get(part.currency) ?? 0) + part.amount);
    }
    return [...totals].sort().map(([currency, amount]) => ({ currency, amount }));
  }

  private static periodSeconds(request: UsageRequest): number {
    return Math.max(0, (UsageScope.end(request).getTime() - request.from.getTime()) / 1000);
  }

  /** A percentage with one decimal; 0 when there is nothing to count over. */
  private static share(part: number, whole: number): number {
    return whole > 0 ? Math.round((Math.min(part, whole) / whole) * 1000) / 10 : 0;
  }

  private static uptime(offline: number, whole: number): number {
    return whole > 0 ? Math.round(1000 - (Math.min(offline, whole) / whole) * 1000) / 10 : 100;
  }
}
