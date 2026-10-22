/**
 * Where a permission applies: the whole tenant, or only some sites.
 * A Technician given chargers:command on two sites has a scope of those two sites.
 */
export class SiteScope {
  private constructor(
    readonly isWholeTenant: boolean,
    readonly siteIds: ReadonlySet<string>,
  ) {}

  static wholeTenant(): SiteScope {
    return new SiteScope(true, new Set());
  }

  static sites(siteIds: Iterable<string>): SiteScope {
    return new SiteScope(false, new Set(siteIds));
  }

  /** Is this site inside the scope? Services check every row they touch with this. */
  allows(siteId: string): boolean {
    return this.isWholeTenant || this.siteIds.has(siteId);
  }

  /** Two grants of the same permission add up: whole tenant wins, otherwise the sites are combined. */
  merge(other: SiteScope): SiteScope {
    if (this.isWholeTenant || other.isWholeTenant) {
      return SiteScope.wholeTenant();
    }
    return SiteScope.sites([...this.siteIds, ...other.siteIds]);
  }

  /** Does this scope include everything `other` does? Used so nobody grants more than they hold. */
  covers(other: SiteScope): boolean {
    if (this.isWholeTenant) {
      return true;
    }
    return !other.isWholeTenant && [...other.siteIds].every((siteId) => this.siteIds.has(siteId));
  }

  /** `null` for the whole tenant, otherwise the site ids (the API's wire format). */
  toSiteIds(): string[] | null {
    return this.isWholeTenant ? null : [...this.siteIds].sort();
  }
}
