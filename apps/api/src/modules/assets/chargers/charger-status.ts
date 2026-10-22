import { sql, SQL } from 'drizzle-orm';
import { chargers, connectors } from '@wattwisely/db';

/** A charger's state in one word, derived from what it last reported (API Design, "Chargers"). */
export type ChargerStatus =
  'waiting' | 'offline' | 'faulted' | 'charging' | 'available' | 'unavailable';

/**
 * Works out a charger's status in SQL, so lists can filter and sort by it:
 *   waiting      never sent a BootNotification
 *   offline      silent for longer than 2.5 heartbeat intervals (OCPP gateway design)
 *   faulted      any connector reports a fault
 *   charging     any connector has a car on it
 *   available    any connector is free
 *   unavailable  every connector is out of service (or none reported yet)
 */
export class ChargerStatusSql {
  static readonly VALUES: ChargerStatus[] = [
    'waiting',
    'offline',
    'faulted',
    'charging',
    'available',
    'unavailable',
  ];
  static readonly DEFAULT_HEARTBEAT_S = 300;
  static readonly SILENT_AFTER_INTERVALS = 2.5;
  static readonly IN_USE_STATUSES = [
    'preparing',
    'charging',
    'suspended_ev',
    'suspended_evse',
    'finishing',
    'occupied',
  ];

  /** Free of bind parameters, so the same expression can appear in SELECT and GROUP BY. */
  static expression(): SQL {
    const silentAfter = sql.raw(
      `interval '1 second' * ${ChargerStatusSql.SILENT_AFTER_INTERVALS} * coalesce(`,
    );
    const inUse = sql.raw(
      `in (${ChargerStatusSql.IN_USE_STATUSES.map((status) => `'${status}'`).join(', ')})`,
    );
    return sql`case
      when ${chargers.lastBootAt} is null then 'waiting'
      when ${chargers.lastSeenAt} is null
        or ${chargers.lastSeenAt} < now() - ${silentAfter}${chargers.heartbeatIntervalS}, ${sql.raw(String(ChargerStatusSql.DEFAULT_HEARTBEAT_S))}) then 'offline'
      when ${ChargerStatusSql.hasConnector(sql`= 'faulted'`)} then 'faulted'
      when ${ChargerStatusSql.hasConnector(inUse)} then 'charging'
      when ${ChargerStatusSql.hasConnector(sql`= 'available'`)} then 'available'
      else 'unavailable' end`;
  }

  private static hasConnector(statusCondition: SQL): SQL {
    return sql`exists (select 1 from ${connectors} where ${connectors.chargerId} = ${chargers.id} and ${connectors.status}::text ${statusCondition})`;
  }
}
