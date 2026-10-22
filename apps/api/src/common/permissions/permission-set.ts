import { SiteScope } from './site-scope';

/** One role a member holds and where it applies. */
export interface RoleGrant {
  readonly roleId: string;
  readonly roleKey: string | null;
  readonly roleName: string;
  readonly siteId: string | null;
  readonly permissionKeys: readonly string[];
}

/**
 * What a member may do in the current tenant: every permission they hold through
 * any of their roles, each with the sites where it applies.
 */
export class PermissionSet {
  private constructor(private readonly scopes: ReadonlyMap<string, SiteScope>) {}

  static fromGrants(grants: readonly RoleGrant[]): PermissionSet {
    const scopes = new Map<string, SiteScope>();
    for (const grant of grants) {
      const scope = grant.siteId ? SiteScope.sites([grant.siteId]) : SiteScope.wholeTenant();
      for (const key of grant.permissionKeys) {
        scopes.set(key, scopes.get(key)?.merge(scope) ?? scope);
      }
    }
    return new PermissionSet(scopes);
  }

  /** True when the member holds the permission anywhere (whole tenant or at least one site). */
  can(key: string): boolean {
    return this.scopes.has(key);
  }

  /** Where the permission applies. Services use it to filter rows by site; null means not held. */
  scopeFor(key: string): SiteScope | null {
    return this.scopes.get(key) ?? null;
  }

  keys(): string[] {
    return [...this.scopes.keys()].sort();
  }
}
