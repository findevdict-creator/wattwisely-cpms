import { PermissionSet } from '../../../common/permissions/permission-set';
import { ApiKeyScopePolicy } from './api-key-scope.policy';

describe('ApiKeyScopePolicy', () => {
  const owner = PermissionSet.fromGrants([
    {
      roleId: 'r1',
      roleKey: 'owner',
      roleName: 'Owner',
      siteId: null,
      permissionKeys: ['sites:read', 'sessions:read', 'chargers:command', 'api_keys:manage'],
    },
    {
      roleId: 'r2',
      roleKey: null,
      roleName: 'Site only',
      siteId: 'site-1',
      permissionKeys: ['drivers:read'],
    },
  ]);

  it('cleans the keys and keeps them within the maker’s company-wide access', () => {
    expect(ApiKeyScopePolicy.check([' sessions:read', 'sites:read', 'sites:read'], owner)).toEqual([
      'sessions:read',
      'sites:read',
    ]);
  });

  it('refuses unknown keys, api_keys:manage, and keys held for some sites only or not at all', () => {
    expect(() => ApiKeyScopePolicy.check(['chargers:fly'], owner)).toThrow(/no permission/);
    expect(() => ApiKeyScopePolicy.check(['api_keys:manage'], owner)).toThrow(/cannot be given/);
    expect(() => ApiKeyScopePolicy.check(['drivers:read'], owner)).toThrow(/whole company/);
    expect(() => ApiKeyScopePolicy.check(['team:manage'], owner)).toThrow(/whole company/);
  });
});
