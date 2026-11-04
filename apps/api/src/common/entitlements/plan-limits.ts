import { HttpStatus } from '@nestjs/common';
import { and, count, eq, inArray, isNull, notExists } from 'drizzle-orm';
import {
  chargers,
  connectors,
  membershipRoles,
  tenantMemberships,
  Transaction,
} from '@wattwisely/db';
import { ManagedOperatorRole } from '../managed/managed-operator-role';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';

/**
 * The plan's size limits (PRD section 7: users and connectors per plan), checked inside the
 * transaction that adds one more. A plan without a limit, or a tenant without a plan, passes.
 * Connectors a charger reports by itself are never refused: the limit is a sales rule, and
 * a charger that works must keep working; registering another charger is, and the admin
 * console shows who is over.
 */
export class PlanLimits {
  /**
   * Before an invitation: the tenant's active and invited members both take a seat. Wattwisely
   * staff working in the tenant as its Managed operator (module 10) take none. The tenant is
   * named in the query: the transaction also shows the inviter their own memberships elsewhere.
   */
  static async ensureUserRoom(tx: Transaction, access: TenantAccess): Promise<void> {
    const limit = access.entitlements.plan?.userLimit;
    if (!limit) {
      return;
    }
    const [row] = await tx
      .select({ count: count() })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, access.tenant.id),
          inArray(tenantMemberships.status, ['active', 'invited']),
          notExists(PlanLimits.managedOperatorGrant(tx)),
        ),
      );
    if (row.count >= limit) {
      throw PlanLimits.reached('plan_user_limit', `${limit} users`);
    }
  }

  private static managedOperatorGrant(tx: Transaction) {
    return tx
      .select({ id: membershipRoles.id })
      .from(membershipRoles)
      .where(
        and(
          eq(membershipRoles.membershipId, tenantMemberships.id),
          eq(membershipRoles.roleId, ManagedOperatorRole.ID),
        ),
      );
  }

  /**
   * Before a connector is added by hand, and before a charger is registered (its connectors
   * come over OCPP, where nothing is refused): connectors of chargers that still exist count.
   */
  static async ensureConnectorRoom(tx: Transaction, access: TenantAccess): Promise<void> {
    const limit = access.entitlements.plan?.connectorLimit;
    if (!limit) {
      return;
    }
    const [row] = await tx
      .select({ count: count() })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(and(eq(connectors.tenantId, access.tenant.id), isNull(chargers.deletedAt)));
    if (row.count >= limit) {
      throw PlanLimits.reached('plan_connector_limit', `${limit} connectors`);
    }
  }

  private static reached(code: string, limit: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      code,
      `Your plan allows ${limit}. Ask Wattwisely for a bigger plan to add more.`,
    );
  }
}
