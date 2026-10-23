import { PermissionDefinition } from './permission-definition';

/**
 * The permissions of the managed service (module 10). Only the Owner holds them: accepting
 * the agreement and giving notice (stories MGT-01, MGT-05), and approving the tariff changes
 * a Managed operator proposes (story MGT-03). Migration 0016 gives them to the Owner role.
 */
export class ManagedPermissions {
  static readonly ENTRIES = [
    {
      key: 'managed_service:manage',
      area: 'settings',
      label: 'Accept or end the managed service',
      isReadOnly: false,
    },
    {
      key: 'tariffs:approve',
      area: 'tariffs',
      label: 'Approve proposed tariff changes',
      isReadOnly: false,
    },
  ] as const satisfies readonly PermissionDefinition[];
}
