import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  alertRules,
  roles,
  sites,
  tenantMemberships,
  Transaction,
  userAccounts,
  UuidV7,
} from '@wattwisely/db';
import { AlertRuleInput, AlertRuleRecord } from './alert-rule-record';

/** Reads and replaces a tenant's alert routing. RLS keeps it inside the current tenant. */
@Injectable()
export class AlertRulesRepository {
  async findAll(tx: Transaction): Promise<AlertRuleRecord[]> {
    return tx
      .select({
        id: alertRules.id,
        alertType: alertRules.alertType,
        siteId: alertRules.siteId,
        siteName: sites.name,
        roleId: alertRules.roleId,
        roleName: roles.name,
        membershipId: alertRules.membershipId,
        memberName: sql<
          string | null
        >`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
        isEmail: alertRules.isEmail,
        isInPortal: alertRules.isInPortal,
      })
      .from(alertRules)
      .leftJoin(sites, eq(sites.id, alertRules.siteId))
      .leftJoin(roles, eq(roles.id, alertRules.roleId))
      .leftJoin(tenantMemberships, eq(tenantMemberships.id, alertRules.membershipId))
      .leftJoin(userAccounts, eq(userAccounts.id, tenantMemberships.userAccountId))
      .orderBy(asc(alertRules.alertType), asc(alertRules.createdAt));
  }

  async replace(
    tx: Transaction,
    tenantId: string,
    rules: AlertRuleInput[],
    by: string,
  ): Promise<void> {
    await tx.delete(alertRules);
    if (rules.length === 0) {
      return;
    }
    await tx
      .insert(alertRules)
      .values(rules.map((rule) => ({ id: UuidV7.create(), tenantId, ...rule, createdBy: by })));
  }

  /** The ids among these that are sites of the tenant. */
  async existingSites(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx
      .select({ id: sites.id })
      .from(sites)
      .where(and(inArray(sites.id, ids), isNull(sites.deletedAt)));
    return new Set(rows.map((row) => row.id));
  }

  /** The ids among these that are system roles or the tenant's own. */
  async existingRoles(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx.select({ id: roles.id }).from(roles).where(inArray(roles.id, ids));
    return new Set(rows.map((row) => row.id));
  }

  /** The ids among these that are active members of the tenant. */
  async activeMembers(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(
          inArray(tenantMemberships.id, ids),
          or(eq(tenantMemberships.status, 'active'), eq(tenantMemberships.status, 'invited')),
        ),
      );
    return new Set(rows.map((row) => row.id));
  }
}
