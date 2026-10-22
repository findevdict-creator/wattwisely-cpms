import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, ne } from 'drizzle-orm';
import {
  membershipRoles,
  rolePermissions,
  roles,
  tenantMemberships,
  Transaction,
} from '@wattwisely/db';
import { RoleRecord } from './role-record';

/** Reads roles and their permissions. RLS shows system roles plus the current tenant's own. */
@Injectable()
export class RolesRepository {
  async findAll(tx: Transaction, roleIds?: string[]): Promise<RoleRecord[]> {
    const rows = await tx
      .select({
        id: roles.id,
        key: roles.key,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
        permissionKey: rolePermissions.permissionKey,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(roleIds ? inArray(roles.id, roleIds) : undefined)
      .orderBy(asc(roles.createdAt), asc(roles.id), asc(rolePermissions.permissionKey));
    return RolesRepository.group(rows);
  }

  /** How many people (invited or active) hold each role in the current tenant. */
  async countMembers(tx: Transaction): Promise<Map<string, number>> {
    const rows = await tx
      .select({ roleId: membershipRoles.roleId, members: count(tenantMemberships.id) })
      .from(membershipRoles)
      .innerJoin(
        tenantMemberships,
        and(
          eq(tenantMemberships.id, membershipRoles.membershipId),
          ne(tenantMemberships.status, 'removed'),
        ),
      )
      .groupBy(membershipRoles.roleId);
    return new Map(rows.map((row) => [row.roleId, row.members]));
  }

  private static group(
    rows: (Omit<RoleRecord, 'permissionKeys'> & { permissionKey: string | null })[],
  ): RoleRecord[] {
    const records = new Map<string, RoleRecord>();
    for (const { permissionKey, ...role } of rows) {
      const record = records.get(role.id) ?? { ...role, permissionKeys: [] };
      if (permissionKey) {
        record.permissionKeys.push(permissionKey);
      }
      records.set(role.id, record);
    }
    return [...records.values()];
  }
}
