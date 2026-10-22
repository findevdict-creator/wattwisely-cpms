import { PermissionSet } from '../../common/permissions/permission-set';
import { RoleRecord } from '../roles/role-record';
import { RoleAssignment } from './role-assignment';
import { RoleAssignmentPolicy } from './role-assignment.policy';

describe('RoleAssignmentPolicy', () => {
  const policy = { check: RoleAssignmentPolicy.checkAgainst };
  const technician: RoleRecord = {
    id: 'technician',
    key: 'technician',
    name: 'Technician',
    description: '',
    isSystem: true,
    permissionKeys: ['chargers:read', 'chargers:command'],
  };
  const actorWith = (siteId: string | null, keys: string[]) =>
    PermissionSet.fromGrants([
      { roleId: 'r', roleKey: null, roleName: 'R', siteId, permissionKeys: keys },
    ]);
  const allKeys = ['chargers:read', 'chargers:command', 'team:manage'];

  it('lets an owner give any role, anywhere', () => {
    expect(() =>
      policy.check(
        [new RoleAssignment('technician', null)],
        [technician],
        actorWith(null, allKeys),
      ),
    ).not.toThrow();
  });

  it('refuses a role that does not exist', () => {
    expect(() =>
      policy.check([new RoleAssignment('ghost', null)], [technician], actorWith(null, allKeys)),
    ).toThrow(expect.objectContaining({ code: 'role_not_found' }));
  });

  it('refuses a role with a permission the giver lacks', () => {
    expect(() =>
      policy.check(
        [new RoleAssignment('technician', null)],
        [technician],
        actorWith(null, ['chargers:read', 'team:manage']),
      ),
    ).toThrow(expect.objectContaining({ code: 'role_exceeds_own_access', status: 403 }));
  });

  it('lets a site-scoped giver give the role only on their own sites', () => {
    const actor = actorWith('site-a', allKeys);

    expect(() =>
      policy.check([new RoleAssignment('technician', 'site-a')], [technician], actor),
    ).not.toThrow();
    expect(() =>
      policy.check([new RoleAssignment('technician', 'site-b')], [technician], actor),
    ).toThrow(expect.objectContaining({ code: 'role_exceeds_own_access' }));
    expect(() =>
      policy.check([new RoleAssignment('technician', null)], [technician], actor),
    ).toThrow(expect.objectContaining({ code: 'role_exceeds_own_access' }));
  });
});
