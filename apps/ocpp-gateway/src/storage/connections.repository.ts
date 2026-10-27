import { Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { chargerConnections, Transaction } from '@wattwisely/db';
import { OcppVersion } from '@wattwisely/ocpp-contracts';

/** The lease row a gateway writes when it accepts a charger's socket. */
export interface ConnectionLease {
  chargerId: string;
  tenantId: string;
  instanceId: string;
  connectionId: string;
  remoteIp: string | null;
  ocppVersion: OcppVersion;
  leaseSeconds: number;
}

/** The charger_connections table: who holds which charger's socket, as a lease. */
@Injectable()
export class ConnectionsRepository {
  /**
   * Takes the lease when nobody holds a live one. False means another live connection
   * exists (on this instance or another), which the duplicate check then deals with.
   */
  async acquire(tx: Transaction, lease: ConnectionLease): Promise<boolean> {
    const expiresAt = sql`now() + make_interval(secs => ${lease.leaseSeconds})`;
    const rows = await tx
      .insert(chargerConnections)
      .values({
        chargerId: lease.chargerId,
        tenantId: lease.tenantId,
        instanceId: lease.instanceId,
        connectionId: lease.connectionId,
        ocppVersion: lease.ocppVersion,
        remoteIp: lease.remoteIp,
        leaseExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: chargerConnections.chargerId,
        set: {
          instanceId: lease.instanceId,
          connectionId: lease.connectionId,
          remoteIp: lease.remoteIp,
          ocppVersion: lease.ocppVersion,
          isBooted: false,
          connectedAt: sql`now()`,
          leaseExpiresAt: expiresAt,
        },
        setWhere: sql`${chargerConnections.leaseExpiresAt} <= now()`,
      })
      .returning({ chargerId: chargerConnections.chargerId });
    return rows.length === 1;
  }

  /** Renews the leases this instance holds for these chargers (all in the current tenant). */
  async refresh(tx: Transaction, instanceId: string, chargerIds: string[], leaseSeconds: number) {
    await tx
      .update(chargerConnections)
      .set({ leaseExpiresAt: sql`now() + make_interval(secs => ${leaseSeconds})` })
      .where(
        and(
          eq(chargerConnections.instanceId, instanceId),
          inArray(chargerConnections.chargerId, chargerIds),
        ),
      );
  }

  async markBooted(tx: Transaction, chargerId: string, connectionId: string): Promise<void> {
    await tx
      .update(chargerConnections)
      .set({ isBooted: true })
      .where(
        and(
          eq(chargerConnections.chargerId, chargerId),
          eq(chargerConnections.connectionId, connectionId),
        ),
      );
  }

  /** Drops the lease, but only if this very connection still holds it. */
  async release(tx: Transaction, chargerId: string, connectionId: string): Promise<void> {
    await tx
      .delete(chargerConnections)
      .where(
        and(
          eq(chargerConnections.chargerId, chargerId),
          eq(chargerConnections.connectionId, connectionId),
        ),
      );
  }
}
