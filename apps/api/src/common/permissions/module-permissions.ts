import { PermissionDefinition } from './permission-definition';

/**
 * The permissions of the modules a plan or an add-on switches on (module 9). A role may
 * hold them in any tenant, like every other permission; a tenant whose plan lacks the
 * module cannot use them (PermissionGuard answers "module not in plan"). The screens
 * behind most of them arrive in later modules; the keys exist now so plans can be sold.
 */
export class ModulePermissions {
  static readonly ENTRIES = [
    { key: 'reports:read', area: 'reports', label: 'See reports', isReadOnly: true },
    {
      key: 'reports:schedule',
      area: 'reports',
      label: 'Schedule reports by e-mail',
      isReadOnly: false,
    },
    {
      key: 'custom_roles:manage',
      area: 'team',
      label: 'Create and edit custom roles',
      isReadOnly: false,
    },
    {
      key: 'load_management:read',
      area: 'load_management',
      label: 'See power caps and load',
      isReadOnly: true,
    },
    {
      key: 'load_management:write',
      area: 'load_management',
      label: 'Set power caps per site',
      isReadOnly: false,
    },
    {
      key: 'messaging:manage',
      area: 'messaging',
      label: 'Set up charging by messaging app',
      isReadOnly: false,
    },
  ] as const satisfies readonly PermissionDefinition[];
}
