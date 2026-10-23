import { ModuleCatalog } from './module-catalog';
import { PermissionCatalog } from './permission-catalog';

describe('ModuleCatalog', () => {
  it('puts every permission in exactly one module', () => {
    const owners = new Map<string, string[]>();
    for (const module of ModuleCatalog.ENTRIES) {
      for (const key of module.permissionKeys) {
        owners.set(key, [...(owners.get(key) ?? []), module.key]);
      }
    }

    const missing = PermissionCatalog.ENTRIES.map((e) => e.key).filter((k) => !owners.has(k));
    const shared = [...owners.entries()].filter(([, modules]) => modules.length > 1);
    expect(missing).toEqual([]);
    expect(shared).toEqual([]);
  });

  it('knows which module a permission belongs to', () => {
    expect(ModuleCatalog.moduleOf('chargers:command')?.key).toBe('chargers');
    expect(ModuleCatalog.moduleOf('load_management:write')?.kind).toBe('addon');
    expect(ModuleCatalog.moduleOf('nothing:here')).toBeUndefined();
  });

  it('lists only plan and add-on modules as gated', () => {
    const gated = ModuleCatalog.gated().map((module) => module.key);

    expect(gated).toEqual([
      'advanced_reports',
      'custom_roles',
      'api_keys',
      'load_management',
      'messaging_charging',
    ]);
    expect(ModuleCatalog.isKnown('sites')).toBe(true);
  });
});
