import { ManagedPermissions } from './managed-permissions';
import { ModulePermissions } from './module-permissions';
import { PermissionDefinition } from './permission-definition';

export { PermissionDefinition } from './permission-definition';

/**
 * Every permission key the API knows, grouped by area for the role matrix screen.
 * Endpoints name one of these keys; a key that is not here does not compile.
 * The system roles that hold them are created by packages/db/migrations/0002_system_roles.sql
 * (0014 for the plan modules' permissions, which ModulePermissions lists, and 0016 for the
 * managed service permissions, which ManagedPermissions lists).
 */
export class PermissionCatalog {
  /** The permissions of the core modules, which every plan includes. */
  static readonly CORE_ENTRIES = [
    { key: 'team:read', area: 'team', label: 'See team members and roles', isReadOnly: true },
    {
      key: 'team:manage',
      area: 'team',
      label: 'Invite, change and remove members',
      isReadOnly: false,
    },
    { key: 'audit:read', area: 'audit', label: 'Read the audit log', isReadOnly: true },
    { key: 'settings:read', area: 'settings', label: 'See settings', isReadOnly: true },
    {
      key: 'settings:write',
      area: 'settings',
      label: 'Change settings and branding',
      isReadOnly: false,
    },
    {
      key: 'settings:payments',
      area: 'settings',
      label: 'Manage the payment account',
      isReadOnly: false,
    },
    {
      key: 'api_keys:manage',
      area: 'settings',
      label: 'Manage API keys and webhooks',
      isReadOnly: false,
    },
    { key: 'sites:read', area: 'sites', label: 'See sites', isReadOnly: true },
    { key: 'sites:write', area: 'sites', label: 'Create and edit sites', isReadOnly: false },
    { key: 'sites:delete', area: 'sites', label: 'Delete sites', isReadOnly: false },
    {
      key: 'stickers:print',
      area: 'sites',
      label: 'Print and replace QR stickers',
      isReadOnly: false,
    },
    {
      key: 'chargers:read',
      area: 'chargers',
      label: 'See chargers and their messages',
      isReadOnly: true,
    },
    {
      key: 'chargers:write',
      area: 'chargers',
      label: 'Register and edit chargers',
      isReadOnly: false,
    },
    { key: 'chargers:delete', area: 'chargers', label: 'Remove chargers', isReadOnly: false },
    {
      key: 'chargers:command',
      area: 'chargers',
      label: 'Start, stop, reset and unlock',
      isReadOnly: false,
    },
    {
      key: 'chargers:config',
      area: 'chargers',
      label: 'Read and change configuration',
      isReadOnly: false,
    },
    {
      key: 'chargers:firmware',
      area: 'chargers',
      label: 'Update firmware, get diagnostics',
      isReadOnly: false,
    },
    { key: 'tariffs:read', area: 'tariffs', label: 'See tariffs', isReadOnly: true },
    {
      key: 'tariffs:write',
      area: 'tariffs',
      label: 'Create and edit tariffs and discounts',
      isReadOnly: false,
    },
    { key: 'tariffs:delete', area: 'tariffs', label: 'Delete tariffs', isReadOnly: false },
    {
      key: 'sessions:read',
      area: 'sessions',
      label: 'See sessions and dashboards',
      isReadOnly: true,
    },
    { key: 'sessions:export', area: 'sessions', label: 'Export sessions', isReadOnly: true },
    {
      key: 'sessions:close_stuck',
      area: 'sessions',
      label: 'Close stuck sessions',
      isReadOnly: false,
    },
    { key: 'drivers:read', area: 'drivers', label: 'See drivers', isReadOnly: true },
    {
      key: 'drivers:read_personal',
      area: 'drivers',
      label: "See drivers' personal data",
      isReadOnly: true,
    },
    {
      key: 'drivers:write',
      area: 'drivers',
      label: 'Invite and edit drivers and groups',
      isReadOnly: false,
    },
    {
      key: 'drivers:block',
      area: 'drivers',
      label: 'Block and unblock drivers',
      isReadOnly: false,
    },
    { key: 'drivers:delete', area: 'drivers', label: 'Delete driver profiles', isReadOnly: false },
    { key: 'payments:read', area: 'payments', label: 'See payments and refunds', isReadOnly: true },
    {
      key: 'payments:refund',
      area: 'payments',
      label: 'Issue refunds, waive balances',
      isReadOnly: false,
    },
    {
      key: 'payments:approve_refund',
      area: 'payments',
      label: 'Approve refunds above the limit',
      isReadOnly: false,
    },
    {
      key: 'payments:reconcile',
      area: 'payments',
      label: 'Resolve reconciliation items',
      isReadOnly: false,
    },
    { key: 'invoices:read', area: 'invoices', label: 'See and resend invoices', isReadOnly: true },
    { key: 'invoices:reissue', area: 'invoices', label: 'Reissue invoices', isReadOnly: false },
    { key: 'alerts:read', area: 'alerts', label: 'See alerts', isReadOnly: true },
    { key: 'alerts:acknowledge', area: 'alerts', label: 'Acknowledge alerts', isReadOnly: false },
  ] as const satisfies readonly PermissionDefinition[];

  static readonly ENTRIES = [
    ...PermissionCatalog.CORE_ENTRIES,
    ...ModulePermissions.ENTRIES,
    ...ManagedPermissions.ENTRIES,
  ] as const satisfies readonly PermissionDefinition[];

  static find(key: string): PermissionDefinition | undefined {
    return PermissionCatalog.ENTRIES.find((entry) => entry.key === key);
  }

  static isKnown(key: string): key is PermissionKey {
    return PermissionCatalog.find(key) !== undefined;
  }
}

/** A permission key that exists, e.g. 'chargers:command'. */
export type PermissionKey = (typeof PermissionCatalog.ENTRIES)[number]['key'];
