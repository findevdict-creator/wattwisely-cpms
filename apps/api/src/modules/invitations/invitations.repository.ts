import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, isNull, ne, sql, SQL } from 'drizzle-orm';
import { tenantMemberships, tenants, Transaction, userAccounts } from '@wattwisely/db';
import { InvitationRecord } from './invitation-record';

/**
 * Finds pending invitations: by the hash of a link, for a transaction that carries that hash
 * (DatabaseSession.forInvitation, so RLS shows the one membership), or by the person invited,
 * for a transaction that carries their account (DatabaseSession.forUser, so RLS shows their
 * own memberships in every tenant).
 */
@Injectable()
export class InvitationsRepository {
  async findByTokenHash(tx: Transaction, tokenHash: string): Promise<InvitationRecord | null> {
    const rows = await this.pending(tx, eq(tenantMemberships.inviteTokenHash, tokenHash));
    return rows[0] ?? null;
  }

  /** The person's unexpired invitations, oldest first. */
  findPendingForAccount(tx: Transaction, userAccountId: string, now: Date) {
    return this.pending(
      tx,
      and(
        eq(tenantMemberships.userAccountId, userAccountId),
        gt(tenantMemberships.inviteExpiresAt, now),
      ),
    );
  }

  /** One of the person's invitations by its membership id, expired or not. */
  async findPendingById(
    tx: Transaction,
    userAccountId: string,
    membershipId: string,
  ): Promise<InvitationRecord | null> {
    const rows = await this.pending(
      tx,
      and(
        eq(tenantMemberships.userAccountId, userAccountId),
        eq(tenantMemberships.id, membershipId),
      ),
    );
    return rows[0] ?? null;
  }

  private pending(tx: Transaction, condition: SQL | undefined): Promise<InvitationRecord[]> {
    return tx
      .select({
        membershipId: tenantMemberships.id,
        userAccountId: tenantMemberships.userAccountId,
        email: userAccounts.email,
        hasLogin: sql<boolean>`${userAccounts.keycloakId} is not null`,
        status: tenantMemberships.status,
        expiresAt: tenantMemberships.inviteExpiresAt,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        tenantStatus: tenants.status,
      })
      .from(tenantMemberships)
      .innerJoin(userAccounts, eq(userAccounts.id, tenantMemberships.userAccountId))
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(
        and(
          condition,
          eq(tenantMemberships.status, 'invited'),
          isNull(tenants.deletedAt),
          ne(tenants.status, 'cancelled'),
        ),
      )
      .orderBy(asc(tenantMemberships.invitedAt));
  }
}
