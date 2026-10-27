import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { driverInvitations, drivers, tenants, Transaction, userAccounts } from '@wattwisely/db';
import { DriverInvitationRecord } from './driver-invitation-record';

/** The two ids a link leads to, read before the transaction enters the tenant. */
export interface DriverInvitationTarget {
  id: string;
  tenantId: string;
}

/**
 * Reads and writes driver invitations (module 19). Inside a tenant RLS shows the tenant's
 * rows; with DatabaseSession.forInvitation the holder of a link sees that one row, but not
 * yet the driver it is for: `findTargetByTokenHash` first, then the tenant, then `findById`.
 */
@Injectable()
export class DriverInvitationsRepository {
  static readonly COLUMNS = {
    id: driverInvitations.id,
    tenantId: driverInvitations.tenantId,
    tenantName: tenants.name,
    tenantSlug: tenants.slug,
    driverId: driverInvitations.driverId,
    driverName: drivers.name,
    isDriverDeleted: sql<boolean>`${drivers.deletedAt} is not null`,
    driverAccountId: drivers.driverAccountId,
    email: driverInvitations.email,
    invitedByName: sql<
      string | null
    >`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
    expiresAt: driverInvitations.expiresAt,
    acceptedAt: driverInvitations.acceptedAt,
    declinedAt: driverInvitations.declinedAt,
    cancelledAt: driverInvitations.cancelledAt,
    createdAt: driverInvitations.createdAt,
  };

  /** The invitation behind a link. The transaction must carry the hash (DatabaseSession.forInvitation). */
  async findTargetByTokenHash(
    tx: Transaction,
    tokenHash: string,
  ): Promise<DriverInvitationTarget | null> {
    const rows = await tx
      .select({ id: driverInvitations.id, tenantId: driverInvitations.tenantId })
      .from(driverInvitations)
      .where(eq(driverInvitations.tokenHash, tokenHash));
    return rows[0] ?? null;
  }

  /** The whole invitation, inside its tenant. */
  async findById(tx: Transaction, id: string): Promise<DriverInvitationRecord | null> {
    const rows = await this.select(tx).where(eq(driverInvitations.id, id));
    return rows[0] ?? null;
  }

  /** The invitation of a driver that is still open, if any. */
  async findOpenByDriver(
    tx: Transaction,
    driverId: string,
  ): Promise<DriverInvitationRecord | null> {
    const rows = await this.select(tx).where(
      and(eq(driverInvitations.driverId, driverId), isNotNull(driverInvitations.tokenHash)),
    );
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof driverInvitations.$inferInsert): Promise<void> {
    await tx.insert(driverInvitations).values(row);
  }

  /** A fresh link for an open invitation; the old link stops working. */
  async renew(tx: Transaction, id: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await tx
      .update(driverInvitations)
      .set({ tokenHash, expiresAt, updatedAt: new Date() })
      .where(eq(driverInvitations.id, id));
  }

  /** Closes the invitation: the link stops working and the row records why. */
  async close(
    tx: Transaction,
    id: string,
    outcome: 'accepted' | 'declined' | 'cancelled',
  ): Promise<void> {
    const now = new Date();
    await tx
      .update(driverInvitations)
      .set({
        tokenHash: null,
        acceptedAt: outcome === 'accepted' ? now : undefined,
        declinedAt: outcome === 'declined' ? now : undefined,
        cancelledAt: outcome === 'cancelled' ? now : undefined,
        updatedAt: now,
      })
      .where(eq(driverInvitations.id, id));
  }

  private select(tx: Transaction) {
    return tx
      .select(DriverInvitationsRepository.COLUMNS)
      .from(driverInvitations)
      .innerJoin(drivers, eq(drivers.id, driverInvitations.driverId))
      .innerJoin(tenants, eq(tenants.id, driverInvitations.tenantId))
      .leftJoin(userAccounts, eq(userAccounts.id, driverInvitations.invitedBy))
      .$dynamic();
  }
}
