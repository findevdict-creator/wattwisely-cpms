import { AnyPgColumn, foreignKey } from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { connectors } from './connectors.table';
import { drivers } from './drivers.table';
import { rfidCards } from './rfid-cards.table';
import { sites } from './sites.table';
import { tariffVersions } from './tariff-versions.table';

/** The columns of charging_sessions that point at other tables. */
interface SessionReferenceColumns {
  tenantId: AnyPgColumn;
  siteId: AnyPgColumn;
  chargerId: AnyPgColumn;
  connectorId: AnyPgColumn;
  tariffVersionId: AnyPgColumn;
  driverId: AnyPgColumn;
  rfidCardId: AnyPgColumn;
}

/**
 * The foreign keys of charging_sessions. Each one includes tenant_id, so a session can
 * never point at another tenant's site, charger, connector, tariff version, driver or card.
 */
export class ChargingSessionReferences {
  static of(table: SessionReferenceColumns) {
    return [...ChargingSessionReferences.place(table), ...ChargingSessionReferences.who(table)];
  }

  /** Where the session happened and what it was priced with. */
  private static place(table: SessionReferenceColumns) {
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

  /** Who started it, when the idTag was a registered RFID card (module 13). */
  private static who(table: SessionReferenceColumns) {
    return [
      foreignKey({
        name: 'charging_sessions_driver_fk',
        columns: [table.tenantId, table.driverId],
        foreignColumns: [drivers.tenantId, drivers.id],
      }),
      foreignKey({
        name: 'charging_sessions_rfid_card_fk',
        columns: [table.tenantId, table.rfidCardId],
        foreignColumns: [rfidCards.tenantId, rfidCards.id],
      }),
    ];
  }
}
