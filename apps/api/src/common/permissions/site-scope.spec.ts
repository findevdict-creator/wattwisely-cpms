import { SiteScope } from './site-scope';

describe('SiteScope', () => {
  const siteA = 'site-a';
  const siteB = 'site-b';

  it('allows every site when it covers the whole tenant', () => {
    expect(SiteScope.wholeTenant().allows(siteA)).toBe(true);
  });

  it('allows only its own sites when site-scoped', () => {
    const scope = SiteScope.sites([siteA]);

    expect(scope.allows(siteA)).toBe(true);
    expect(scope.allows(siteB)).toBe(false);
  });

  it('merges site grants, and a whole-tenant grant wins', () => {
    expect(
      SiteScope.sites([siteA])
        .merge(SiteScope.sites([siteB]))
        .toSiteIds(),
    ).toEqual([siteA, siteB]);
    expect(SiteScope.sites([siteA]).merge(SiteScope.wholeTenant()).isWholeTenant).toBe(true);
  });

  it('covers a smaller scope but never a larger one', () => {
    expect(SiteScope.wholeTenant().covers(SiteScope.sites([siteA]))).toBe(true);
    expect(SiteScope.sites([siteA, siteB]).covers(SiteScope.sites([siteA]))).toBe(true);
    expect(SiteScope.sites([siteA]).covers(SiteScope.sites([siteB]))).toBe(false);
    expect(SiteScope.sites([siteA]).covers(SiteScope.wholeTenant())).toBe(false);
  });
});
