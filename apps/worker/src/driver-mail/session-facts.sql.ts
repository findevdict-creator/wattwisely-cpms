import { sql } from 'drizzle-orm';

/**
 * The columns and joins of a session that the driver e-mails (module 11) and pushes
 * (module 34) both read: where it is, how it went, what it cost and the idle fee terms.
 * The query that uses them names the session `s` and adds who wants to hear about it.
 */
export class SessionFactsSql {
  static readonly COLUMNS = sql`s.status, si.name as site_name, c.ocpp_identity as charger_identity,
    co.label as connector_label, s.time_zone, s.started_at, s.ended_at, s.unplugged_at,
    s.energy_wh, s.currency, s.gross_amount, s.tax_amount, s.is_paid,
    p.status as payment_status, p.captured_amount,
    (select m.soc_percent from meter_values m where m.session_id = s.id and m.soc_percent is not null
      order by m.measured_at desc limit 1) as soc_percent,
    (select min(h.occurred_at) from session_state_changes h
      where h.session_id = s.id and h.to_status in ('idle', 'stopping')) as finished_at,
    tv.idle_grace_minutes, tv.idle_fee_cap, tv.bands`;

  static readonly JOINS = sql`join sites si on si.id = s.site_id
    join chargers c on c.id = s.charger_id
    join connectors co on co.id = s.connector_id
    left join tariff_versions tv on tv.id = s.tariff_version_id
    left join payments p on p.session_id = s.id and p.type = 'preauth'`;
}
