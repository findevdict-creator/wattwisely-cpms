/** One thing Wattwisely staff can do in the admin console. */
export interface PlatformPermissionDefinition {
  readonly key: string;
  readonly label: string;
}

/**
 * What the admin console (module 9) lets Wattwisely staff do. Admin routes name one of these
 * with RouteAccess.platform(); PlatformRoleCatalog says which staff role holds which.
 * None of them gives access to a tenant's own data; that comes with a managed service
 * agreement (module 10: tenants:manage_service assigns staff as Managed operators).
 */
export class PlatformPermissionCatalog {
  static readonly ENTRIES = [
    { key: 'tenants:read', label: 'See tenants, their plans, modules and size' },
    {
      key: 'tenants:write',
      label: 'Create and edit tenants, set plans and modules, invite Owners',
    },
    { key: 'tenants:suspend', label: 'Suspend and reactivate tenants' },
    { key: 'tenants:delete', label: 'Delete suspended tenants' },
    {
      key: 'tenants:manage_service',
      label: 'Offer and end managed service agreements, assign Managed operators',
    },
    { key: 'plans:read', label: 'See plans and add-on prices' },
    { key: 'plans:write', label: 'Create and change plans and add-on prices' },
    { key: 'staff:read', label: 'See Wattwisely staff and their roles' },
    { key: 'staff:manage', label: 'Add, change and remove Wattwisely staff' },
    { key: 'platform_audit:read', label: "Read every tenant's audit log" },
  ] as const satisfies readonly PlatformPermissionDefinition[];

  static isKnown(key: string): key is PlatformPermissionKey {
    return PlatformPermissionCatalog.ENTRIES.some((entry) => entry.key === key);
  }

  static keys(): PlatformPermissionKey[] {
    return PlatformPermissionCatalog.ENTRIES.map((entry) => entry.key);
  }
}

/** A platform permission key that exists, e.g. 'tenants:write'. */
export type PlatformPermissionKey = (typeof PlatformPermissionCatalog.ENTRIES)[number]['key'];
