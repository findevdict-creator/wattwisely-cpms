import { PlatformPermissionCatalog, PlatformPermissionKey } from './platform-permission-catalog';

/** A Wattwisely staff role, as stored in platform_staff.role. */
export type PlatformRole = 'admin' | 'billing' | 'support' | 'viewer';

/** One staff role and what it allows in the admin console. */
export interface PlatformRoleDefinition {
  readonly key: PlatformRole;
  readonly name: string;
  readonly description: string;
  readonly permissionKeys: readonly PlatformPermissionKey[];
}

/**
 * The four roles Wattwisely's own people can have (module 9). Fixed in code, like the
 * platform permissions: there are few staff, and the roles change with the product.
 */
export class PlatformRoleCatalog {
  static readonly ROLES: readonly PlatformRoleDefinition[] = [
    {
      key: 'admin',
      name: 'Admin',
      description: 'Everything: tenants, plans, staff and the audit log.',
      permissionKeys: PlatformPermissionCatalog.keys(),
    },
    {
      key: 'billing',
      name: 'Billing',
      description: 'Plans, prices and each tenant’s plan and modules.',
      permissionKeys: [
        'tenants:read',
        'tenants:write',
        'plans:read',
        'plans:write',
        'staff:read',
        'platform_audit:read',
      ],
    },
    {
      key: 'support',
      name: 'Support',
      description: 'Helps tenants: edits their details and modules, invites Owners.',
      permissionKeys: [
        'tenants:read',
        'tenants:write',
        'plans:read',
        'staff:read',
        'platform_audit:read',
      ],
    },
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Sees everything in the console and changes nothing.',
      permissionKeys: ['tenants:read', 'plans:read', 'staff:read', 'platform_audit:read'],
    },
  ];

  static find(role: string): PlatformRoleDefinition | undefined {
    return PlatformRoleCatalog.ROLES.find((entry) => entry.key === role);
  }

  static isKnown(role: string): role is PlatformRole {
    return PlatformRoleCatalog.find(role) !== undefined;
  }
}
