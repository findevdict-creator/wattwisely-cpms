import { Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { sessionLineItems, StoredTariffBand, Transaction } from '@wattwisely/db';
import { WatchedSession } from './watched-session';

/** One receipt line for the e-mail. */
export interface ReceiptLineRow {
  kind: string;
  bandName: string | null;
  quantity: number;
  unit: string;
  gross: number;
}

/** A row of the watch query, as Postgres returns it. */
interface WatchRow extends Record<string, unknown> {
  session_id: string;
  email: string;
  wants_started: boolean;
  wants_nearly_full: boolean;
  wants_finished: boolean;
  wants_idle_warning: boolean;
  status: string;
  site_name: string;
  charger_identity: string;
  connector_label: string;
  time_zone: string;
  started_at: Date;
  ended_at: Date | null;
  unplugged_at: Date | null;
  energy_wh: string;
  currency: string | null;
  gross_amount: string | null;
  tax_amount: string | null;
  is_paid: boolean;
  payment_status: string | null;
  captured_amount: string | null;
  soc_percent: number | null;
  finished_at: Date | null;
  idle_grace_minutes: number | null;
  idle_fee_cap: string | null;
  bands: StoredTariffBand[] | null;
  sent_kinds: string[];
}

/**
 * The sessions drivers asked to hear about (NTF-01), until their receipt is out. Sessions
 * whose address bounced are left alone, and so are sessions closed more than two days ago.
 */
@Injectable()
export class WatchedSessionsRepository {
  async findWatched(tx: Transaction, now: Date): Promise<WatchedSession[]> {
    const result = await tx.execute<WatchRow>(sql`
      select w.session_id, w.email, w.wants_started, w.wants_nearly_full, w.wants_finished,
        w.wants_idle_warning, s.status, si.name as site_name, c.ocpp_identity as charger_identity,
        co.label as connector_label, s.time_zone, s.started_at, s.ended_at, s.unplugged_at,
        s.energy_wh, s.currency, s.gross_amount, s.tax_amount, s.is_paid,
        p.status as payment_status, p.captured_amount,
        (select m.soc_percent from meter_values m where m.session_id = s.id and m.soc_percent is not null
          order by m.measured_at desc limit 1) as soc_percent,
        (select min(h.occurred_at) from session_state_changes h
          where h.session_id = s.id and h.to_status in ('idle', 'stopping')) as finished_at,
        tv.idle_grace_minutes, tv.idle_fee_cap, tv.bands,
        array(select n.kind from notifications n where n.session_id = s.id) as sent_kinds
      from session_subscriptions w
      join charging_sessions s on s.id = w.session_id
      join sites si on si.id = s.site_id
      join chargers c on c.id = s.charger_id
      join connectors co on co.id = s.connector_id
      left join tariff_versions tv on tv.id = s.tariff_version_id
      left join payments p on p.session_id = s.id and p.type = 'preauth'
      where not w.is_undeliverable
        and (s.closed_at is null or s.closed_at > ${now.toISOString()}::timestamptz - interval '2 days')
        and not exists (select 1 from notifications r where r.session_id = s.id and r.kind = 'session_receipt')
      order by s.started_at`);
    return result.rows.map((row) => WatchedSessionsRepository.toSession(row));
  }

  async findLines(tx: Transaction, sessionId: string): Promise<ReceiptLineRow[]> {
    return tx
      .select({
        kind: sessionLineItems.kind,
        bandName: sessionLineItems.bandName,
        quantity: sessionLineItems.quantity,
        unit: sessionLineItems.unit,
        gross: sessionLineItems.gross,
      })
      .from(sessionLineItems)
      .where(eq(sessionLineItems.sessionId, sessionId))
      .orderBy(asc(sessionLineItems.position));
  }

  private static toSession(row: WatchRow): WatchedSession {
    return {
      sessionId: row.session_id,
      email: row.email,
      wantsStarted: row.wants_started,
      wantsNearlyFull: row.wants_nearly_full,
      wantsFinished: row.wants_finished,
      wantsIdleWarning: row.wants_idle_warning,
      status: row.status,
      siteName: row.site_name,
      chargerIdentity: row.charger_identity,
      connectorLabel: row.connector_label,
      timeZone: row.time_zone,
      startedAt: new Date(row.started_at),
      endedAt: WatchedSessionsRepository.date(row.ended_at),
      unpluggedAt: WatchedSessionsRepository.date(row.unplugged_at),
      finishedAt: WatchedSessionsRepository.date(row.finished_at),
      socPercent: row.soc_percent,
      sentKinds: row.sent_kinds,
      ...WatchedSessionsRepository.money(row),
    };
  }

  /** The price, the payment and the idle fee terms. */
  private static money(row: WatchRow) {
    const amount = (value: string | null) => (value === null ? null : Number(value));
    return {
      energyWh: Number(row.energy_wh),
      currency: row.currency,
      grossAmount: amount(row.gross_amount),
      taxAmount: amount(row.tax_amount),
      isPaid: row.is_paid,
      paymentStatus: row.payment_status,
      capturedAmount: amount(row.captured_amount),
      tariff: row.bands
        ? {
            idleGraceMinutes: row.idle_grace_minutes ?? 0,
            idleFeeCap: amount(row.idle_fee_cap),
            bands: row.bands,
          }
        : null,
    };
  }

  private static date(value: Date | null): Date | null {
    return value ? new Date(value) : null;
  }
}
