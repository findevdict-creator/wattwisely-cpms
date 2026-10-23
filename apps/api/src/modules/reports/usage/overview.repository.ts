import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { chargers, Transaction } from '@wattwisely/db';
import { SiteScopeCondition } from '../../../common/database/site-scope.condition';
import { SiteScope } from '../../../common/permissions/site-scope';

/** The live counts on the home page. */
export interface OverviewCounts {
  chargers: number;
  chargers_online: number;
  chargers_offline: number;
  connectors_faulted: number;
  sessions_active: number;
  alerts_open: number;
}

/** Counts what is happening right now at the caller's sites. */
@Injectable()
export class OverviewRepository {
  async counts(tx: Transaction, scope: SiteScope): Promise<OverviewCounts> {
    const inScope = SiteScopeCondition.on(chargers.siteId, scope) ?? sql`true`;
    const result = await tx.execute<OverviewCounts & Record<string, unknown>>(sql`
      with scoped as (select id from chargers where deleted_at is null and ${inScope})
      select
        (select count(*)::int from scoped) as chargers,
        (select count(*)::int from charger_connections cc join scoped s on s.id = cc.charger_id
          where cc.lease_expires_at > now()) as chargers_online,
        (select count(distinct a.charger_id)::int from alerts a join scoped s on s.id = a.charger_id
          where a.type = 'charger_offline' and a.status <> 'closed') as chargers_offline,
        (select count(*)::int from connectors co join scoped s on s.id = co.charger_id
          where co.status = 'faulted') as connectors_faulted,
        (select count(*)::int from charging_sessions cs join scoped s on s.id = cs.charger_id
          where cs.closed_at is null and cs.status in ('charging', 'suspended', 'idle', 'stopping')) as sessions_active,
        (select count(*)::int from alerts a join scoped s on s.id = a.charger_id
          where a.status = 'open') as alerts_open`);
    return result.rows[0];
  }
}
