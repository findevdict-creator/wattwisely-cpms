import { sql, SQL } from 'drizzle-orm';
import { alerts, chargingSessions, Transaction } from '@wattwisely/db';
import { UsageRequest } from './usage-request';
import { UsageScope } from './usage-scope';

/** What happened at one site or charger in the period. */
export interface UsageActivity {
  id: string;
  sessions: number;
  energy_wh: number;
  occupied_seconds: number;
}

/** Revenue of one site or charger in one currency. */
export interface UsageRevenueRow {
  id: string;
  currency: string;
  amount: number;
}

/** Offline time of one site or charger. */
export interface UsageOffline {
  id: string;
  offline_seconds: number;
}

/**
 * The figures of a usage report, by site or charger. Sessions, energy and revenue belong to
 * the period they started in; plugged-in time and offline time are clipped to the period.
 * A session that never started is left out, and only completed sessions earn revenue.
 */
export class UsageActivityQuery {
  static async sessions(tx: Transaction, request: UsageRequest): Promise<UsageActivity[]> {
    const end = UsageScope.end(request);
    const plugged = sql`coalesce(unplugged_at, ended_at, closed_at, ${end.toISOString()}::timestamptz)`;
    const result = await tx.execute<UsageActivity & Record<string, unknown>>(sql`
      select ${UsageActivityQuery.key(request)} as id,
        count(*) filter (where started_at >= ${request.from.toISOString()}::timestamptz)::int as sessions,
        coalesce(sum(energy_wh) filter (where started_at >= ${request.from.toISOString()}::timestamptz), 0)::float8 as energy_wh,
        coalesce(sum(greatest(0, extract(epoch from least(${plugged}, ${end.toISOString()}::timestamptz)
          - greatest(started_at, ${request.from.toISOString()}::timestamptz)))), 0)::float8 as occupied_seconds
      from charging_sessions
      where status <> 'not_started' and ${UsageScope.on(chargingSessions.siteId, request)}
        and started_at < ${end.toISOString()}::timestamptz and ${plugged} > ${request.from.toISOString()}::timestamptz
      group by 1`);
    return result.rows;
  }

  static async revenue(tx: Transaction, request: UsageRequest): Promise<UsageRevenueRow[]> {
    const result = await tx.execute<UsageRevenueRow & Record<string, unknown>>(sql`
      select ${UsageActivityQuery.key(request)} as id, currency, sum(gross_amount)::float8 as amount
      from charging_sessions
      where status = 'completed' and gross_amount is not null and currency is not null
        and ${UsageScope.on(chargingSessions.siteId, request)}
        and started_at >= ${request.from.toISOString()}::timestamptz
        and started_at < ${request.to.toISOString()}::timestamptz
      group by 1, 2 order by 2`);
    return result.rows;
  }

  static async offline(tx: Transaction, request: UsageRequest): Promise<UsageOffline[]> {
    const end = UsageScope.end(request).toISOString();
    const from = request.from.toISOString();
    const result = await tx.execute<UsageOffline & Record<string, unknown>>(sql`
      select ${UsageActivityQuery.key(request)} as id,
        coalesce(sum(greatest(0, extract(epoch from least(coalesce(closed_at, ${end}::timestamptz), ${end}::timestamptz)
          - greatest(began_at, ${from}::timestamptz)))), 0)::float8 as offline_seconds
      from alerts
      where type = 'charger_offline' and ${UsageScope.on(alerts.siteId, request)}
        and began_at < ${end}::timestamptz and coalesce(closed_at, ${end}::timestamptz) > ${from}::timestamptz
      group by 1`);
    return result.rows;
  }

  private static key(request: UsageRequest): SQL {
    return request.groupBy === 'site' ? sql.raw('site_id') : sql.raw('charger_id');
  }
}
