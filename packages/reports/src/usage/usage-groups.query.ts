import { sql } from 'drizzle-orm';
import { sites, Transaction } from '@wattwisely/db';
import { UsageRequest } from './usage-request';
import { UsageScope } from './usage-scope';

/** A site or charger with the equipment the percentages are counted over. */
export interface UsageGroup {
  id: string;
  name: string;
  site_name: string;
  chargers: number;
  connectors: number;
}

/** The report's rows before any figures: every site or charger in scope, by name. */
export class UsageGroupsQuery {
  static async run(tx: Transaction, request: UsageRequest): Promise<UsageGroup[]> {
    const isSite = request.groupBy === 'site';
    const key = isSite ? sql`sites.id` : sql`chargers.id`;
    const name = isSite ? sql`sites.name` : sql`chargers.ocpp_identity`;
    const result = await tx.execute<UsageGroup & Record<string, unknown>>(sql`
      select ${key} as id, ${name} as name, sites.name as site_name,
        count(distinct chargers.id)::int as chargers, count(connectors.id)::int as connectors
      from sites
      ${isSite ? sql`left join` : sql`join`} chargers
        on chargers.site_id = sites.id and chargers.deleted_at is null
      left join connectors on connectors.charger_id = chargers.id
      where sites.deleted_at is null and ${UsageScope.on(sites.id, request)}
        ${isSite ? sql`` : sql`and chargers.id is not null`}
      group by ${key}, ${name}, sites.name
      order by sites.name, ${name}`);
    return result.rows;
  }
}
