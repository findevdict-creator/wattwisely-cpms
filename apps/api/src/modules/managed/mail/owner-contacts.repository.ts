import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  membershipRoles,
  roles,
  tenantMemberships,
  Transaction,
  userAccounts,
} from '@wattwisely/db';

/** An Owner the platform writes to about the managed service. */
export interface OwnerContact {
  userAccountId: string;
  email: string;
  name: string;
}

/** The active Owners of the current tenant: who accepts the agreement and who approves tariffs. */
@Injectable()
export class OwnerContactsRepository {
  static readonly OWNER_ROLE_KEY = 'owner';

  async findActiveOwners(tx: Transaction): Promise<OwnerContact[]> {
    const rows = await tx
      .selectDistinct({
        userAccountId: userAccounts.id,
        email: userAccounts.email,
        name: userAccounts.name,
      })
      .from(tenantMemberships)
      .innerJoin(membershipRoles, eq(membershipRoles.membershipId, tenantMemberships.id))
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .innerJoin(userAccounts, eq(userAccounts.id, tenantMemberships.userAccountId))
      .where(
        and(
          eq(tenantMemberships.status, 'active'),
          eq(roles.key, OwnerContactsRepository.OWNER_ROLE_KEY),
          isNull(membershipRoles.siteId),
        ),
      );
    return rows;
  }
}
