import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { AlertFinding } from '../alert-finding';
import { AlertDetector } from './alert-detector';

/**
 * A charger is offline when no gateway holds a live connection to it and it has been
 * silent for longer than the 60-second grace (NTF-04). A charger that never connected is
 * still being set up, not offline.
 */
@Injectable()
export class ChargerOfflineDetector extends AlertDetector {
  static readonly GRACE_SECONDS = 60;
  readonly type = 'charger_offline' as const;

  async find(tx: Transaction, now: Date): Promise<AlertFinding[]> {
    const result = await tx.execute<{
      id: string;
      site_id: string;
      ocpp_identity: string;
      last_seen_at: string;
    }>(sql`
      select c.id, c.site_id, c.ocpp_identity, c.last_seen_at
      from chargers c
      where c.deleted_at is null and c.last_seen_at is not null
        and c.last_seen_at < ${now.toISOString()}::timestamptz - make_interval(secs => ${ChargerOfflineDetector.GRACE_SECONDS})
        and not exists (select 1 from charger_connections cc
          where cc.charger_id = c.id and cc.lease_expires_at > ${now.toISOString()}::timestamptz)`);
    return result.rows.map((row) => ({
      type: this.type,
      subjectKey: row.id,
      siteId: row.site_id,
      chargerId: row.id,
      connectorId: null,
      sessionId: null,
      title: `${row.ocpp_identity} is offline`,
      details: { last_seen_at: new Date(row.last_seen_at).toISOString() },
      beganAt: new Date(row.last_seen_at),
    }));
  }
}
