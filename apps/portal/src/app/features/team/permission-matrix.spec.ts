import { Permission, Role } from '../../core/api/models/role';
import { PermissionMatrix } from './permission-matrix';

describe('PermissionMatrix', () => {
  const permission = (key: string, module: string, isLocked = false): Permission => ({
    key,
    area: key.split(':')[0],
    label: key,
    is_read_only: key.endsWith(':read'),
    module,
    module_name: module === 'advanced_reports' ? 'Full reports' : module,
    is_locked: isLocked,
  });
  const catalogue = [
    permission('team:read', 'team'),
    permission('sites:read', 'sites'),
    permission('team:manage', 'team'),
    permission('reports:schedule', 'advanced_reports', true),
  ];
  const technician: Role = {
    id: 'r1',
    key: 'technician',
    name: 'Technician',
    description: '',
    is_system: true,
    permissions: ['sites:read', 'team:read'],
    member_count: 2,
    version: 1,
    created_at: '',
    updated_at: '',
  };

  it('groups permissions by module in the order they first appear, and notes locked modules', () => {
    const groups = PermissionMatrix.group(catalogue);

    expect(groups.map((group) => group.name)).toEqual(['team', 'sites', 'Full reports']);
    expect(groups[0].permissions.map((p) => p.key)).toEqual(['team:read', 'team:manage']);
    expect(groups.map((group) => group.isLocked)).toEqual([false, false, true]);
  });

  it('tells which permissions a role holds, and how many of a group', () => {
    const [team] = PermissionMatrix.group(catalogue);

    expect(PermissionMatrix.holds(technician, 'team:read')).toBe(true);
    expect(PermissionMatrix.holds(technician, 'team:manage')).toBe(false);
    expect(PermissionMatrix.countHeld(technician, team)).toBe(1);
  });
});
