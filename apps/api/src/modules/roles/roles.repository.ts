import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import {
  membershipRoles,
  rolePermissions,
  roles,
  tenantMemberships,
  Transaction,
  UuidV7,
} from '@wattwisely/db';
import { RoleRecord } from './role-record';

/**
 * Reads roles and their permissions, and writes a tenant's own custom roles (module 14).
 * RLS shows system roles plus the current tenant's own, and lets only the latter change.
 */
@Injectable()
export class RolesRepository {
  async findAll(tx: Transaction, roleIds?: string[]): Promise<RoleRecord[]> {
    const rows = await tx
      .select({
        id: roles.id,
        tenantId: roles.tenantId,
        key: roles.key,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
        version: roles.version,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        permissionKey: rolePermissions.permissionKey,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(roleIds ? inArray(roles.id, roleIds) : undefined)
      .orderBy(asc(roles.createdAt), asc(roles.id), asc(rolePermissions.permissionKey));
    return RolesRepository.group(rows);
  }

  async findById(tx: Transaction, roleId: string): Promise<RoleRecord | null> {
    return (await this.findAll(tx, [roleId]))[0] ?? null;
  }

  /** How many people (invited or active) hold each role in the current tenant. */
  async countMembers(tx: Transaction): Promise<Map<string, number>> {
    const rows = await tx
      .select({ roleId: membershipRoles.roleId, members: count(tenantMemberships.id) })
      .from(membershipRoles)
      .innerJoin(tenantMemberships, RolesRepository.heldBy())
      .groupBy(membershipRoles.roleId);
    return new Map(rows.map((row) => [row.roleId, row.members]));
  }

  /** The accounts of the people (invited or active) who hold a role: their cached access is stale after a change. */
  async findHolderAccountIds(tx: Transaction, roleId: string): Promise<string[]> {
    const rows = await tx
      .selectDistinct({ accountId: tenantMemberships.userAccountId })
      .from(membershipRoles)
      .innerJoin(tenantMemberships, RolesRepository.heldBy())
      .where(eq(membershipRoles.roleId, roleId));
    return rows.map((row) => row.accountId);
  }

  async insert(tx: Transaction, row: typeof roles.$inferInsert): Promise<void> {
    await tx.insert(roles).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    roleId: string,
    version: number,
    changes: Partial<typeof roles.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(roles)
      .set({ ...changes, version: sql`${roles.version} + 1`, updatedAt: new Date() })
      .where(and(eq(roles.id, roleId), eq(roles.version, version)))
      .returning({ id: roles.id });
    return rows.length === 1;
  }

  /** The permissions go with it (ON DELETE CASCADE); a role still held by someone is refused by the database. */
  async remove(tx: Transaction, roleId: string): Promise<void> {
    await tx.delete(roles).where(eq(roles.id, roleId));
  }

  /** Replaces the permissions of a custom role as a whole. */
  async setPermissions(tx: Transaction, tenantId: string, roleId: string, keys: string[]) {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (keys.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(keys.map((key) => ({ id: UuidV7.create(), roleId, tenantId, permissionKey: key })));
    }
  }

  private static heldBy() {
    return and(
      eq(tenantMemberships.id, membershipRoles.membershipId),
      ne(tenantMemberships.status, 'removed'),
    );
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
