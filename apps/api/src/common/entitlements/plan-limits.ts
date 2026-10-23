import { HttpStatus } from '@nestjs/common';
import { count, eq, inArray, isNull } from 'drizzle-orm';
import { chargers, connectors, tenantMemberships, Transaction } from '@wattwisely/db';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';

/**
 * The plan's size limits (PRD section 7: users and connectors per plan), checked inside the
 * transaction that adds one more. A plan without a limit, or a tenant without a plan, passes.
 * Connectors a charger reports by itself are never refused: the limit is a sales rule, and
 * a charger that works must keep working; the admin console shows who is over.
 */
export class PlanLimits {
  /** Before an invitation: active and invited members both take a seat. */
  static async ensureUserRoom(tx: Transaction, access: TenantAccess): Promise<void> {
    const limit = access.entitlements.plan?.userLimit;
    if (!limit) {
      return;
    }
    const [row] = await tx
      .select({ count: count() })
      .from(tenantMemberships)
      .where(inArray(tenantMemberships.status, ['active', 'invited']));
    if (row.count >= limit) {
      throw PlanLimits.reached('plan_user_limit', `${limit} users`);
    }
  }

  /** Before a connector is added by hand: connectors of chargers that still exist count. */
  static async ensureConnectorRoom(tx: Transaction, access: TenantAccess): Promise<void> {
    const limit = access.entitlements.plan?.connectorLimit;
    if (!limit) {
      return;
    }
    const [row] = await tx
      .select({ count: count() })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(isNull(chargers.deletedAt));
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
