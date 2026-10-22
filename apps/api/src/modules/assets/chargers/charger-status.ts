import { sql, SQL } from 'drizzle-orm';
import { chargerConnections, chargers, connectors } from '@wattwisely/db';

/** A charger's state in one word, derived from what it last reported (API Design, "Chargers"). */
export type ChargerStatus =
  'waiting' | 'offline' | 'faulted' | 'charging' | 'available' | 'unavailable';

/**
 * Works out a charger's status in SQL, so lists can filter and sort by it:
 *   waiting      never sent a BootNotification
 *   offline      no gateway holds a live connection lease for it (charger_connections)
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
    const inUse = sql.raw(
      `in (${ChargerStatusSql.IN_USE_STATUSES.map((status) => `'${status}'`).join(', ')})`,
    );
    return sql`case
      when ${chargers.lastBootAt} is null then 'waiting'
      when not ${ChargerStatusSql.isOnline()} then 'offline'
      when ${ChargerStatusSql.hasConnector(sql`= 'faulted'`)} then 'faulted'
      when ${ChargerStatusSql.hasConnector(inUse)} then 'charging'
      when ${ChargerStatusSql.hasConnector(sql`= 'available'`)} then 'available'
      else 'unavailable' end`;
  }

  /** True while a gateway instance holds a live lease on the charger's socket. */
  static isOnline(): SQL {
    return sql`exists (select 1 from ${chargerConnections} where ${chargerConnections.chargerId} = ${chargers.id} and ${chargerConnections.leaseExpiresAt} > now())`;
  }

  private static hasConnector(statusCondition: SQL): SQL {
    return sql`exists (select 1 from ${connectors} where ${connectors.chargerId} = ${chargers.id} and ${connectors.status}::text ${statusCondition})`;
  }
}
