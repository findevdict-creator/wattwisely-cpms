import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { chargers, chargingSessions, connectors, Transaction } from '@wattwisely/db';
import { SessionStates } from '@wattwisely/session-engine';

/** The charger behind an identity, found before its tenant is known. */
export interface PublicCharger {
  id: string;
  tenantId: string;
  identity: string;
}

/** The plug a driver named. */
export interface PublicConnector {
  id: string;
  label: string;
}

/** Finds the charger and connector a driver's QR code names. */
@Injectable()
export class ChargePlaceLookup {
  /** States in which the connector cannot take another paid session. */
  static readonly BUSY_STATES = ['authorising', 'starting', ...SessionStates.ACTIVE] as const;

  /** Run under DatabaseSession.forChargerIdentity: the identity policy shows just this charger. */
  async charger(tx: Transaction, identity: string): Promise<PublicCharger | null> {
    const rows = await tx
      .select({ id: chargers.id, tenantId: chargers.tenantId, identity: chargers.ocppIdentity })
      .from(chargers)
      .where(
        and(
          eq(sql`lower(${chargers.ocppIdentity})`, identity.toLowerCase()),
          isNull(chargers.deletedAt),
        ),
      );
    return rows[0] ?? null;
  }

  async connector(
    tx: Transaction,
    chargerId: string,
    ocppConnectorId: number,
  ): Promise<PublicConnector | null> {
    const rows = await tx
      .select({ id: connectors.id, label: connectors.label })
      .from(connectors)
      .where(
        and(eq(connectors.chargerId, chargerId), eq(connectors.ocppConnectorId, ocppConnectorId)),
      );
    return rows[0] ?? null;
  }

  async isBusy(tx: Transaction, connectorId: string): Promise<boolean> {
    const rows = await tx
      .select({ id: chargingSessions.id })
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.connectorId, connectorId),
          inArray(chargingSessions.status, [...ChargePlaceLookup.BUSY_STATES]),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** The names the driver's page shows for a session's place. */
  async placeOf(tx: Transaction, connectorId: string) {
    const rows = await tx
      .select({ chargerIdentity: chargers.ocppIdentity, connectorLabel: connectors.label })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(eq(connectors.id, connectorId));
    return rows[0] ?? { chargerIdentity: '', connectorLabel: '' };
  }
}
