import { SiteScope } from '../../common/permissions/site-scope';

/** One row of membership_roles to be: a role for the whole tenant (siteId null) or one site. */
export class RoleAssignment {
  constructor(
    readonly roleId: string,
    readonly siteId: string | null,
  ) {}

  /** Turns the API's `{ role_id, site_ids }` items into one assignment per role and site. */
  static fromRequest(items: { role_id: string; site_ids?: string[] }[]): RoleAssignment[] {
    const assignments = items.flatMap((item) =>
      item.site_ids?.length
        ? item.site_ids.map((siteId) => new RoleAssignment(item.role_id, siteId))
        : [new RoleAssignment(item.role_id, null)],
    );
    const unique = new Map(assignments.map((a) => [`${a.roleId}:${a.siteId ?? ''}`, a]));
    return [...unique.values()];
  }

  get scope(): SiteScope {
    return this.siteId ? SiteScope.sites([this.siteId]) : SiteScope.wholeTenant();
  }
}
