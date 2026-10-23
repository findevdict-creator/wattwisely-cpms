import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { AlertFinding } from '../alert-finding';
import { AlertDetector } from './alert-detector';

/**
 * A charger that accepted a reset and has not booted again within 5 minutes (NTF-04).
 * Only the last day's resets count; the offline alert covers anything older.
 */
@Injectable()
export class ResetNoReturnDetector extends AlertDetector {
  static readonly WAIT_MINUTES = 5;
  readonly type = 'reset_no_return' as const;

  async find(tx: Transaction, now: Date): Promise<AlertFinding[]> {
    const at = sql`${now.toISOString()}::timestamptz`;
    const result = await tx.execute<{
      charger_id: string;
      site_id: string;
      ocpp_identity: string;
      reset_at: string;
    }>(sql`
      select distinct on (c.id) c.id as charger_id, c.site_id, c.ocpp_identity, k.completed_at as reset_at
      from charger_commands k join chargers c on c.id = k.charger_id
      where k.action = 'reset' and k.status = 'accepted' and c.deleted_at is null
        and k.completed_at < ${at} - make_interval(mins => ${ResetNoReturnDetector.WAIT_MINUTES})
        and k.completed_at > ${at} - interval '1 day'
        and (c.last_boot_at is null or c.last_boot_at < k.completed_at)
      order by c.id, k.completed_at desc`);
    return result.rows.map((row) => ({
      type: this.type,
      subjectKey: row.charger_id,
      siteId: row.site_id,
      chargerId: row.charger_id,
      connectorId: null,
      sessionId: null,
      title: `${row.ocpp_identity} did not come back after a reset`,
      details: { reset_at: new Date(row.reset_at).toISOString() },
      beganAt: new Date(row.reset_at),
    }));
  }
}
