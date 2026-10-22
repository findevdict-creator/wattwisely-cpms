import { AnyPgColumn, foreignKey } from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { connectors } from './connectors.table';
import { sites } from './sites.table';
import { tariffVersions } from './tariff-versions.table';

/** The columns of charging_sessions that point at other tables. */
interface SessionReferenceColumns {
  tenantId: AnyPgColumn;
  siteId: AnyPgColumn;
  chargerId: AnyPgColumn;
  connectorId: AnyPgColumn;
  tariffVersionId: AnyPgColumn;
}

/**
 * The foreign keys of charging_sessions. Each one includes tenant_id, so a session can
 * never point at another tenant's site, charger, connector or tariff version.
 */
export class ChargingSessionReferences {
  static of(table: SessionReferenceColumns) {
    return [
      foreignKey({
        name: 'charging_sessions_site_fk',
        columns: [table.tenantId, table.siteId],
        foreignColumns: [sites.tenantId, sites.id],
      }),
      foreignKey({
        name: 'charging_sessions_charger_fk',
        columns: [table.tenantId, table.chargerId],
        foreignColumns: [chargers.tenantId, chargers.id],
      }),
      foreignKey({
        name: 'charging_sessions_connector_fk',
        columns: [table.tenantId, table.connectorId],
        foreignColumns: [connectors.tenantId, connectors.id],
      }),
      foreignKey({
        name: 'charging_sessions_tariff_version_fk',
        columns: [table.tenantId, table.tariffVersionId],
        foreignColumns: [tariffVersions.tenantId, tariffVersions.id],
      }),
    ];
  }
}
