import { PermissionCatalog } from '../../common/permissions/permission-catalog';
import { PermissionSet } from '../../common/permissions/permission-set';
import { RoleErrors } from './role-errors';

/**
 * Checks the permissions of a custom role before they are saved (module 14): every key
 * must exist, and nobody can put a permission in a role that they do not hold for the whole
 * company themselves. A role is given tenant-wide or per site later, so the person shaping
 * it must hold each permission everywhere, or they could reach beyond their own access.
 */
export class RolePermissionPolicy {
  /** The keys, cleaned: trimmed, each once, in catalogue order. Throws on an unknown one. */
  static check(keys: readonly string[], actor: PermissionSet): string[] {
    const wanted = new Set(keys.map((key) => key.trim()));
    for (const key of wanted) {
      if (!PermissionCatalog.isKnown(key)) {
        throw RoleErrors.permissionUnknown(key);
      }
      if (!actor.scopeFor(key)?.isWholeTenant) {
        throw RoleErrors.exceedsOwnAccess(key);
      }
    }
    return PermissionCatalog.ENTRIES.map((entry) => entry.key).filter((key) => wanted.has(key));
  }
}
