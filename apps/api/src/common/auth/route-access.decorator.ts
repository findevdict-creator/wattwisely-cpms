import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../permissions/permission-catalog';
import { PlatformPermissionKey } from '../platform/platform-permission-catalog';

/**
 * Every route is private, tenant-scoped and closed until it names a permission.
 * Use these decorators on a controller or a single handler:
 *
 *   @RouteAccess.requires('team:manage')  the caller's roles must hold this permission
 *   @RouteAccess.anyMember()              any active member of the tenant (e.g. GET /tenant)
 *   @RouteAccess.withoutTenant()          login needed, but no tenant selected (e.g. GET /me)
 *   @RouteAccess.public()                 no login needed (health checks, invitation preview)
 *   @RouteAccess.platform('tenants:read') Wattwisely staff only, in the admin console (module 9)
 *
 * A tenant route with none of them is refused, so forgetting a decorator can only
 * make a route stricter, never open it up.
 */
export class RouteAccess {
  static readonly PUBLIC_KEY = 'route-access:public';
  static readonly WITHOUT_TENANT_KEY = 'route-access:without-tenant';
  static readonly PERMISSION_KEY = 'route-access:permission';
  static readonly PLATFORM_KEY = 'route-access:platform';
  static readonly ANY_MEMBER = 'any-member';

  static public(): CustomDecorator {
    return SetMetadata(RouteAccess.PUBLIC_KEY, true);
  }

  static withoutTenant(): CustomDecorator {
    return SetMetadata(RouteAccess.WITHOUT_TENANT_KEY, true);
  }

  static requires(permission: PermissionKey): CustomDecorator {
    return SetMetadata(RouteAccess.PERMISSION_KEY, permission);
  }

  static anyMember(): CustomDecorator {
    return SetMetadata(RouteAccess.PERMISSION_KEY, RouteAccess.ANY_MEMBER);
  }

  /** No tenant: the caller must be Wattwisely staff whose console role holds this permission. */
  static platform(permission: PlatformPermissionKey): CustomDecorator {
    return SetMetadata(RouteAccess.PLATFORM_KEY, permission);
  }
}
