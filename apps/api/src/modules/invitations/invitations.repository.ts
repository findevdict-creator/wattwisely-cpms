import { Injectable } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { tenantMemberships, tenants, userAccounts } from '@wattwisely/db';
import { Transaction } from '../../common/database/transaction-runner';
import { InvitationRecord } from './invitation-record';

/**
 * Finds an invitation by the hash of its link. The transaction must carry that hash
 * (DatabaseSession.forInvitation): RLS shows a membership to whoever holds its link.
 */
@Injectable()
export class InvitationsRepository {
  async findByTokenHash(tx: Transaction, tokenHash: string): Promise<InvitationRecord | null> {
    const rows = await tx
      .select({
        membershipId: tenantMemberships.id,
        userAccountId: tenantMemberships.userAccountId,
        email: userAccounts.email,
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
          eq(tenantMemberships.inviteTokenHash, tokenHash),
          eq(tenantMemberships.status, 'invited'),
          isNull(tenants.deletedAt),
          ne(tenants.status, 'cancelled'),
        ),
      );
    return rows[0] ?? null;
  }
}
