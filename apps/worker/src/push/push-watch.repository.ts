import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { SessionFactsSql } from '../driver-mail/session-facts.sql';
import { WatchedSessionsRepository, WatchRow } from '../driver-mail/watched-sessions.repository';
import { WatchedAccountSession } from './watched-account-session';

/** A row of the query: a watched session's facts and the account it belongs to. */
interface PushWatchRow extends WatchRow {
  driver_account_id: string;
}

/**
 * The sessions whose drivers have the app with pushes on and a phone that takes them
 * (module 34), until their receipt push is out. Only sessions started after the account's
 * first phone registered count, so a new phone is not flooded with old receipts; sessions
 * closed more than two days ago are left alone, as for e-mails.
 */
@Injectable()
export class PushWatchRepository {
  async findWatched(tx: Transaction, now: Date): Promise<WatchedAccountSession[]> {
    const result = await tx.execute<PushWatchRow>(sql`
      select s.id as session_id, '' as email, da.id as driver_account_id,
        da.wants_started, da.wants_nearly_full, da.wants_finished, da.wants_idle_warning,
        ${SessionFactsSql.COLUMNS},
        array(select pd.kind from push_deliveries pd where pd.session_id = s.id) as sent_kinds
      from charging_sessions s
      join drivers d on d.id = s.driver_id
      join driver_accounts da on da.id = d.driver_account_id
      ${SessionFactsSql.JOINS}
      where da.is_push_enabled
        and s.started_at >= (select min(dv.created_at) from driver_devices dv
          where dv.driver_account_id = da.id and dv.invalid_at is null)
        and (s.closed_at is null or s.closed_at > ${now.toISOString()}::timestamptz - interval '2 days')
        and not exists (select 1 from push_deliveries r where r.session_id = s.id and r.kind = 'session_receipt')
      order by s.started_at`);
    return result.rows.map((row) => ({
      ...WatchedSessionsRepository.toSession(row),
      driverAccountId: row.driver_account_id,
    }));
  }
}
