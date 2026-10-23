import { TenantEntitlements } from './tenant-entitlements';

describe('TenantEntitlements', () => {
  const growth = {
    id: 'plan-1',
    code: 'growth',
    name: 'Growth',
    connectorLimit: 500,
    userLimit: null,
    moduleKeys: ['advanced_reports', 'custom_roles', 'api_keys'],
  };
  const now = new Date('2026-10-23T10:00:00Z');

  it('gives a tenant without a plan the core modules only', () => {
    const entitlements = TenantEntitlements.none();

    expect(entitlements.isModuleEnabled('sites')).toBe(true);
    expect(entitlements.isPermissionLocked('chargers:command')).toBe(false);
    expect(entitlements.isPermissionLocked('reports:schedule')).toBe(true);
    expect(entitlements.lockedModuleKeys()).toEqual([
      'advanced_reports',
      'custom_roles',
      'api_keys',
      'load_management',
      'messaging_charging',
    ]);
  });

  it('adds the plan modules, bought add-ons and running trials', () => {
    const entitlements = new TenantEntitlements(
      growth,
      'active',
      [
        { featureKey: 'load_management', source: 'addon', isEnabled: true, endsAt: null },
        {
          featureKey: 'messaging_charging',
          source: 'trial',
          isEnabled: true,
          endsAt: new Date('2026-11-01T00:00:00Z'),
        },
      ],
      now,
    );

    expect(entitlements.sourceOf('custom_roles')).toBe('plan');
    expect(entitlements.sourceOf('load_management')).toBe('addon');
    expect(entitlements.sourceOf('messaging_charging')).toBe('trial');
    expect(entitlements.lockedModuleKeys()).toEqual([]);
  });

  it('ignores an ended trial and lets an override take a plan module away', () => {
    const entitlements = new TenantEntitlements(
      growth,
      'active',
      [
        {
          featureKey: 'load_management',
          source: 'trial',
          isEnabled: true,
          endsAt: new Date('2026-10-01T00:00:00Z'),
        },
        { featureKey: 'api_keys', source: 'override', isEnabled: false, endsAt: null },
      ],
      now,
    );

    expect(entitlements.isModuleLocked('load_management')).toBe(true);
    expect(entitlements.isModuleLocked('api_keys')).toBe(true);
    expect(entitlements.isPermissionLocked('api_keys:manage')).toBe(true);
    expect(entitlements.isModuleLocked('not_a_module')).toBe(false);
  });
});
