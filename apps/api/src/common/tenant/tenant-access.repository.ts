import { Injectable } from '@nestjs/common';
import { and, eq, exists, inArray, isNull, ne, sql } from 'drizzle-orm';
import {
  managedServices,
  membershipRoles,
  rolePermissions,
  roles,
  tenantMemberships,
  tenants,
  Transaction,
} from '@wattwisely/db';
import { RoleGrant } from '../permissions/permission-set';
import { TenantSummary } from './tenant-summary';

/** An active membership together with its tenant. */
export interface ActiveMembership {
  membershipId: string;
  tenant: TenantSummary;
}

/** Reads what TenantAccessResolver needs: active memberships and the roles behind them. */
@Injectable()
export class TenantAccessRepository {
  /** Active memberships in tenants that are open (not cancelled or deleted). */
  async findActiveMemberships(
    tx: Transaction,
    userAccountId: string,
    tenantId?: string,
  ): Promise<ActiveMembership[]> {
    const rows = await tx
      .select({ membershipId: tenantMemberships.id, ...TenantAccessRepository.columns(tx) })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(
        and(
          eq(tenantMemberships.userAccountId, userAccountId),
          eq(tenantMemberships.status, 'active'),
          tenantId ? eq(tenantMemberships.tenantId, tenantId) : undefined,
          isNull(tenants.deletedAt),
          ne(tenants.status, 'cancelled'),
        ),
      )
      .orderBy(tenants.name);
    return rows.map(({ membershipId, isManaged, ...tenant }) => ({
      membershipId,
      tenant: new TenantSummary({ ...tenant, serviceTier: isManaged ? 'managed' : 'self_serve' }),
    }));
  }

  /** One open tenant by id, as an API key's tenant is read (module 16); null when closed or unknown. */
  async findTenant(tx: Transaction, tenantId: string): Promise<TenantSummary | null> {
    const [row] = await tx
      .select(TenantAccessRepository.columns(tx))
      .from(tenants)
      .where(
        and(eq(tenants.id, tenantId), isNull(tenants.deletedAt), ne(tenants.status, 'cancelled')),
      );
    if (!row) {
      return null;
    }
    const { isManaged, ...tenant } = row;
    return new TenantSummary({ ...tenant, serviceTier: isManaged ? 'managed' : 'self_serve' });
  }

  private static columns(tx: Transaction) {
    return {
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      isManaged: TenantAccessRepository.isManaged(tx),
    };
  }

  /** True when a managed service agreement is in force (module 10); false where the session cannot see them. */
  private static isManaged(tx: Transaction) {
    return exists(
      tx
        .select({ one: sql`1` })
        .from(managedServices)
        .where(
          and(
            eq(managedServices.tenantId, tenants.id),
            inArray(managedServices.status, ['active', 'ending']),
          ),
        ),
    ).mapWith(Boolean);
  }

  /** The member's roles, one grant per role and site, each with its permission keys. */
  async findGrants(tx: Transaction, membershipId: string): Promise<RoleGrant[]> {
    const rows = await tx
      .select({
        roleId: roles.id,
        roleKey: roles.key,
        roleName: roles.name,
        siteId: membershipRoles.siteId,
        permissionKey: rolePermissions.permissionKey,
      })
      .from(membershipRoles)
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(eq(membershipRoles.membershipId, membershipId));
    return TenantAccessRepository.groupGrants(rows);
  }

  private static groupGrants(
    rows: (Omit<RoleGrant, 'permissionKeys'> & { permissionKey: string | null })[],
  ): RoleGrant[] {
    const grants = new Map<string, RoleGrant & { permissionKeys: string[] }>();
    for (const { permissionKey, ...grant } of rows) {
      const key = `${grant.roleId}:${grant.siteId ?? ''}`;
      const entry = grants.get(key) ?? { ...grant, permissionKeys: [] };
      if (permissionKey) {
        entry.permissionKeys.push(permissionKey);
      }
      grants.set(key, entry);
    }
    return [...grants.values()];
  }
}
