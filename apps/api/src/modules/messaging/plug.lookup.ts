import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { chargerConnections, chargers, connectors, Transaction } from '@wattwisely/db';

/** The plug a driver named in a chat, inside the tenant's session. */
export interface ChatPlug {
  chargerId: string;
  connectorId: string;
  identity: string;
  ocppConnectorId: number;
  isOnline: boolean;
  connectorStatus: string;
}

/** Finds a plug by the code and number a driver typed (module 17). */
@Injectable()
export class PlugLookup {
  async find(tx: Transaction, identity: string, ocppConnectorId: number): Promise<ChatPlug | null> {
    const rows = await tx
      .select({
        chargerId: chargers.id,
        connectorId: connectors.id,
        identity: chargers.ocppIdentity,
        ocppConnectorId: connectors.ocppConnectorId,
        isOnline: sql<boolean>`exists (select 1 from ${chargerConnections}
          where ${chargerConnections.chargerId} = ${chargers.id} and ${chargerConnections.leaseExpiresAt} > now())`,
        connectorStatus: sql<string>`${connectors.status}::text`,
      })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(
        and(
          eq(sql`lower(${chargers.ocppIdentity})`, identity.toLowerCase()),
          eq(connectors.ocppConnectorId, ocppConnectorId),
          isNull(chargers.deletedAt),
        ),
      );
    return rows[0] ?? null;
  }

  /** "CP-PAY-1 plug 1": the plug as the chat names it, by connector id. */
  async placeOf(tx: Transaction, connectorId: string): Promise<string> {
    const rows = await tx
      .select({ identity: chargers.ocppIdentity, ocppConnectorId: connectors.ocppConnectorId })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(eq(connectors.id, connectorId));
    return rows[0] ? PlugLookup.label(rows[0].identity, rows[0].ocppConnectorId) : 'the plug';
  }

  static label(identity: string, ocppConnectorId: number): string {
    return `${identity} plug ${ocppConnectorId}`;
  }
}
