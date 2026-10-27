import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { AlertFinding } from '../alert-finding';
import { AlertDetector } from './alert-detector';

/** A row of the query below. */
interface StuckRow extends Record<string, unknown> {
  id: string;
  site_id: string;
  charger_id: string;
  connector_id: string;
  ocpp_identity: string;
  started_at: string;
  last_event_at: string;
  is_silent: boolean;
}

/**
 * A session looks stuck when the charger has said nothing about it for 6 hours, or it has
 * been open for more than 48 hours (story SES-05). Staff can then close it by hand.
 */
@Injectable()
export class SessionStuckDetector extends AlertDetector {
  static readonly SILENT_HOURS = 6;
  static readonly OPEN_HOURS = 48;
  readonly type = 'session_stuck' as const;

  async find(tx: Transaction, now: Date): Promise<AlertFinding[]> {
    const at = sql`${now.toISOString()}::timestamptz`;
    const result = await tx.execute<StuckRow>(sql`
      select s.id, s.site_id, s.charger_id, s.connector_id, c.ocpp_identity, s.started_at,
        s.last_event_at, s.last_event_at < ${at} - make_interval(hours => ${SessionStuckDetector.SILENT_HOURS}) as is_silent
      from charging_sessions s join chargers c on c.id = s.charger_id
      where s.closed_at is null and s.status in ('charging', 'suspended', 'idle', 'stopping')
        and (s.last_event_at < ${at} - make_interval(hours => ${SessionStuckDetector.SILENT_HOURS})
          or s.started_at < ${at} - make_interval(hours => ${SessionStuckDetector.OPEN_HOURS}))`);
    return result.rows.map((row) => ({
      type: this.type,
      subjectKey: row.id,
      siteId: row.site_id,
      chargerId: row.charger_id,
      connectorId: row.connector_id,
      sessionId: row.id,
      title: `A session on ${row.ocpp_identity} looks stuck`,
      details: {
        reason: row.is_silent ? 'no_messages' : 'open_too_long',
        started_at: new Date(row.started_at).toISOString(),
        last_event_at: new Date(row.last_event_at).toISOString(),
      },
      beganAt: new Date(row.is_silent ? row.last_event_at : row.started_at),
    }));
  }
}
