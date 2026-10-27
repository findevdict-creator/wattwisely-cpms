import { Permission, Role } from '../../core/api/models/role';

/** The permissions of one module, as one block of rows on the matrix and in the role dialog. */
export interface PermissionGroup {
  module: string;
  name: string;
  /** True when the tenant's plan leaves the module out: its permissions do nothing until it is added. */
  isLocked: boolean;
  permissions: Permission[];
}

/** Arranges the permission catalogue for the roles page and the role dialog (module 14). */
export class PermissionMatrix {
  /** Groups by module, keeping the catalogue's order of first appearance. */
  static group(permissions: Permission[]): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();
    for (const permission of permissions) {
      const group = groups.get(permission.module) ?? {
        module: permission.module,
        name: permission.module_name || permission.module,
        isLocked: permission.is_locked,
        permissions: [],
      };
      group.permissions.push(permission);
      groups.set(permission.module, group);
    }
    return [...groups.values()];
  }

  static holds(role: Role, key: string): boolean {
    return role.permissions.includes(key);
  }

  /** How many of these permissions the role holds, for a "3 of 6" summary. */
  static countHeld(role: Role, group: PermissionGroup): number {
    return group.permissions.filter((permission) => PermissionMatrix.holds(role, permission.key))
      .length;
  }
}
