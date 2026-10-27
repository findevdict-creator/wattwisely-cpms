import { PermissionCatalog } from '../../../common/permissions/permission-catalog';
import { PermissionSet } from '../../../common/permissions/permission-set';
import { ApiKeyChangeErrors } from './api-key-change-errors';

/**
 * The pure rule for what an API key may hold (module 16): every key exists, none of them
 * manages API keys themselves, and the person making the key holds each one for the whole
 * company, as when shaping a custom role (module 14). Answers the keys cleaned, each once.
 */
export class ApiKeyScopePolicy {
  static readonly NOT_FOR_KEYS: readonly string[] = ['api_keys:manage'];

  static check(requested: readonly string[], own: PermissionSet): string[] {
    const keys = [...new Set(requested.map((key) => key.trim()).filter(Boolean))].sort();
    for (const key of keys) {
      if (!PermissionCatalog.isKnown(key)) {
        throw ApiKeyChangeErrors.permissionUnknown(key);
      }
      if (ApiKeyScopePolicy.NOT_FOR_KEYS.includes(key)) {
        throw ApiKeyChangeErrors.permissionNotForKeys(key);
      }
      if (!own.scopeFor(key)?.isWholeTenant) {
        throw ApiKeyChangeErrors.exceedsOwnAccess(key);
      }
    }
    return keys;
  }
}
