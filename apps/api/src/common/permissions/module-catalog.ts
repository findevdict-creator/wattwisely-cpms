import { PermissionKey } from './permission-catalog';

/** How a tenant gets a module: with every plan, with some plans, or by buying an add-on. */
export type ModuleKind = 'core' | 'plan' | 'addon';

/** One module of the product: a feature area with the permissions that use it. */
export interface ModuleDefinition {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly kind: ModuleKind;
  readonly permissionKeys: readonly PermissionKey[];
}

/**
 * The feature registry (Architecture, section 6): every module the product has, which
 * permissions belong to it and whether a plan can lack it. Core modules are in every
 * plan. A plan lists the plan modules it includes (plans.module_keys); add-ons are bought
 * per tenant (tenant_entitlements). Prices live in the database; the modules live here,
 * because the code that implements them does too.
 */
export class ModuleCatalog {
  static readonly ENTRIES: readonly ModuleDefinition[] = [
    ModuleCatalog.core('sites', 'Sites', 'Sites, opening hours and QR stickers', [
      'sites:read',
      'sites:write',
      'sites:delete',
      'stickers:print',
    ]),
    ModuleCatalog.core('chargers', 'Chargers', 'Chargers, connectors and remote commands', [
      'chargers:read',
      'chargers:write',
      'chargers:delete',
      'chargers:command',
      'chargers:config',
      'chargers:firmware',
    ]),
    ModuleCatalog.core('tariffs', 'Tariffs', 'Prices, idle fees and discounts', [
      'tariffs:read',
      'tariffs:write',
      'tariffs:delete',
      'tariffs:approve',
    ]),
    ModuleCatalog.core('sessions', 'Sessions', 'Charging sessions and the live dashboard', [
      'sessions:read',
      'sessions:export',
      'sessions:close_stuck',
    ]),
    ModuleCatalog.core('drivers', 'Drivers', 'Driver profiles and groups', [
      'drivers:read',
      'drivers:read_personal',
      'drivers:write',
      'drivers:block',
      'drivers:delete',
    ]),
    ModuleCatalog.core('payments', 'Payments', 'Payments, refunds, invoices and receipts', [
      'payments:read',
      'payments:refund',
      'payments:approve_refund',
      'payments:reconcile',
      'invoices:read',
      'invoices:reissue',
    ]),
    ModuleCatalog.core('alerts', 'Alerts', 'Charger and payment alerts', [
      'alerts:read',
      'alerts:acknowledge',
    ]),
    ModuleCatalog.core('team', 'Team', 'Team members, invitations and the five roles', [
      'team:read',
      'team:manage',
    ]),
    ModuleCatalog.core('settings', 'Settings', 'Company settings, branding and payouts', [
      'settings:read',
      'settings:write',
      'settings:payments',
      'managed_service:manage',
    ]),
    ModuleCatalog.core('audit', 'Audit log', 'Who changed what', ['audit:read']),
    ModuleCatalog.core('reports', 'Reports', 'Basic usage and revenue reports', ['reports:read']),
    {
      key: 'advanced_reports',
      name: 'Full reports',
      description: 'Every report, with scheduled delivery by e-mail',
      kind: 'plan',
      permissionKeys: ['reports:schedule'],
    },
    {
      key: 'custom_roles',
      name: 'Custom roles',
      description: 'Roles with a chosen set of permissions, beyond the five built in',
      kind: 'plan',
      permissionKeys: ['custom_roles:manage'],
    },
    {
      key: 'api_keys',
      name: 'API keys and webhooks',
      description: 'Access for the operator’s own systems',
      kind: 'plan',
      permissionKeys: ['api_keys:manage'],
    },
    {
      key: 'load_management',
      name: 'Load management',
      description: 'A power cap per site, shared across its chargers',
      kind: 'addon',
      permissionKeys: ['load_management:read', 'load_management:write'],
    },
    {
      key: 'messaging_charging',
      name: 'Messaging-app charging',
      description: 'Drivers start and pay for a session from a messaging app',
      kind: 'addon',
      permissionKeys: ['messaging:manage'],
    },
  ];

  static find(key: string): ModuleDefinition | undefined {
    return ModuleCatalog.ENTRIES.find((entry) => entry.key === key);
  }

  static isKnown(key: string): boolean {
    return ModuleCatalog.find(key) !== undefined;
  }

  /** The modules a plan can include or leave out. */
  static gated(): ModuleDefinition[] {
    return ModuleCatalog.ENTRIES.filter((entry) => entry.kind !== 'core');
  }

  /** The module a permission belongs to; every known permission has exactly one. */
  static moduleOf(permissionKey: string): ModuleDefinition | undefined {
    return ModuleCatalog.ENTRIES.find((entry) =>
      (entry.permissionKeys as readonly string[]).includes(permissionKey),
    );
  }

  private static core(
    key: string,
    name: string,
    description: string,
    permissionKeys: PermissionKey[],
  ): ModuleDefinition {
    return { key, name, description, kind: 'core', permissionKeys };
  }
}
