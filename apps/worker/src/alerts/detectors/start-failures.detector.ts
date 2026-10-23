import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { AlertFinding } from '../alert-finding';
import { AlertDetector } from './alert-detector';

/** A row of the query below. */
interface FailuresRow extends Record<string, unknown> {
  charger_id: string;
  site_id: string;
  ocpp_identity: string;
  failures: number;
  first_at: string;
}

/**
 * Three or more failed starts on one charger within an hour (NTF-04): remote starts the
 * charger refused, did not answer or never received, and sessions that never got going.
 * The alert closes once the last hour has fewer than three.
 */
@Injectable()
export class StartFailuresDetector extends AlertDetector {
  static readonly THRESHOLD = 3;
  readonly type = 'start_failures' as const;

  async find(tx: Transaction, now: Date): Promise<AlertFinding[]> {
    const since = sql`${now.toISOString()}::timestamptz - interval '1 hour'`;
    const result = await tx.execute<FailuresRow>(sql`
      with failures as (
        select charger_id, created_at from charger_commands
        where action = 'remote_start' and status in ('rejected', 'timed_out', 'expired', 'failed')
          and created_at >= ${since}
        union all
        select charger_id, created_at from charging_sessions
        where status = 'not_started' and command_id is null and created_at >= ${since})
      select f.charger_id, c.site_id, c.ocpp_identity, count(*)::int as failures, min(f.created_at) as first_at
      from failures f join chargers c on c.id = f.charger_id
      where c.deleted_at is null
      group by f.charger_id, c.site_id, c.ocpp_identity
      having count(*) >= ${StartFailuresDetector.THRESHOLD}`);
    return result.rows.map((row) => ({
      type: this.type,
      subjectKey: row.charger_id,
      siteId: row.site_id,
      chargerId: row.charger_id,
      connectorId: null,
      sessionId: null,
      title: `${row.ocpp_identity} failed to start ${row.failures} sessions in the last hour`,
      details: { failures: row.failures },
      beganAt: new Date(row.first_at),
    }));
  }
}
