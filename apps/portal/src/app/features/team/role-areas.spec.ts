import { Permission, Role } from '../../core/api/models/role';
import { RoleAreas } from './role-areas';

describe('RoleAreas', () => {
  const permission = (key: string, area: string, isLocked = false) =>
    ({ key, area, label: key, is_locked: isLocked }) as Permission;
  const catalogue = [
    permission('team:read', 'team'),
    permission('sites:read', 'sites'),
    permission('sites:write', 'sites'),
    permission('stickers:print', 'sites'),
    permission('chargers:read', 'chargers'),
    permission('chargers:command', 'chargers'),
    permission('reports:read', 'reports', true),
  ];
  const role = { permissions: ['sites:read', 'stickers:print', 'chargers:read'] } as Role;

  it('puts each area on a row, in the order of the menu', () => {
    expect(RoleAreas.of(role, catalogue).map((row) => row.name)).toEqual([
      'Sites',
      'Chargers',
      'Reports',
      'Team and roles',
    ]);
  });

  it('fills view, edit and delete, and lists the other permissions', () => {
    const [sites, chargers, reports] = RoleAreas.of(role, catalogue);
    expect([sites.view, sites.edit, sites.remove]).toEqual(['held', 'not_held', 'none']);
    expect(sites.special).toEqual([
      { key: 'stickers:print', label: 'stickers:print', isHeld: true },
    ]);
    expect(chargers.special[0].isHeld).toBe(false);
    expect(reports.isLocked).toBe(true);
  });

  it('counts what a role holds', () => {
    expect(RoleAreas.countOf(role, catalogue)).toBe('3');
    expect(RoleAreas.countOf({ permissions: catalogue.map((p) => p.key) } as Role, catalogue)).toBe(
      'All 7',
    );
  });
});
