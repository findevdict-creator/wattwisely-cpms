import { PermissionSet, RoleGrant } from './permission-set';

describe('PermissionSet', () => {
  const grant = (siteId: string | null, permissionKeys: string[]): RoleGrant => ({
    roleId: 'role',
    roleKey: 'technician',
    roleName: 'Technician',
    siteId,
    permissionKeys,
  });

  it('holds a permission given for the whole tenant', () => {
    const permissions = PermissionSet.fromGrants([grant(null, ['chargers:command'])]);

    expect(permissions.can('chargers:command')).toBe(true);
    expect(permissions.scopeFor('chargers:command')?.isWholeTenant).toBe(true);
  });

  it('limits a site-scoped permission to its sites', () => {
    const permissions = PermissionSet.fromGrants([
      grant('site-a', ['chargers:command']),
      grant('site-b', ['chargers:command', 'chargers:read']),
    ]);

    expect(permissions.scopeFor('chargers:command')?.toSiteIds()).toEqual(['site-a', 'site-b']);
    expect(permissions.scopeFor('chargers:read')?.toSiteIds()).toEqual(['site-b']);
  });

  it('does not hold permissions no role gives', () => {
    const permissions = PermissionSet.fromGrants([grant(null, ['sessions:read'])]);

    expect(permissions.can('team:manage')).toBe(false);
    expect(permissions.scopeFor('team:manage')).toBeNull();
  });
});
