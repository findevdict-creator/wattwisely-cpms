import { PlatformRole, PlatformRoleCatalog } from './platform-role-catalog';

/** A Wattwisely staff member's access to the admin console: their role and what it allows. */
export class PlatformAccess {
  readonly permissions: ReadonlySet<string>;

  constructor(
    readonly staffId: string,
    readonly role: PlatformRole,
  ) {
    this.permissions = new Set(PlatformRoleCatalog.find(role)?.permissionKeys ?? []);
  }

  can(permission: string): boolean {
    return this.permissions.has(permission);
  }

  keys(): string[] {
    return [...this.permissions].sort();
  }
}
