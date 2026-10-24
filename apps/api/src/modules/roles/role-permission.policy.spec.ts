import { PermissionSet } from '../../common/permissions/permission-set';
import { RolePermissionPolicy } from './role-permission.policy';

describe('RolePermissionPolicy', () => {
  const actorWith = (siteId: string | null, keys: string[]) =>
    PermissionSet.fromGrants([
      { roleId: 'r', roleKey: null, roleName: 'R', siteId, permissionKeys: keys },
    ]);
  const held = ['chargers:read', 'chargers:command', 'sites:read', 'custom_roles:manage'];

  it('accepts known permissions the actor holds for the whole company, in catalogue order and once', () => {
    const keys = RolePermissionPolicy.check(
      ['chargers:command', ' sites:read', 'chargers:read', 'chargers:command'],
      actorWith(null, held),
    );

    expect(keys).toEqual(['sites:read', 'chargers:read', 'chargers:command']);
  });

  it('refuses a permission that does not exist', () => {
    expect(() => RolePermissionPolicy.check(['chargers:fly'], actorWith(null, held))).toThrow(
      expect.objectContaining({ code: 'permission_unknown', status: 422 }),
    );
  });

  it('refuses a permission the actor lacks, or holds for some sites only', () => {
    expect(() => RolePermissionPolicy.check(['team:manage'], actorWith(null, held))).toThrow(
      expect.objectContaining({ code: 'role_exceeds_own_access', status: 403 }),
    );
    expect(() => RolePermissionPolicy.check(['chargers:read'], actorWith('site-a', held))).toThrow(
      expect.objectContaining({ code: 'role_exceeds_own_access' }),
    );
  });
});
