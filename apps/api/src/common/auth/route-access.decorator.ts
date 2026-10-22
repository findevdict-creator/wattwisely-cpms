import { CustomDecorator, SetMetadata } from '@nestjs/common';

/**
 * Every route is private and tenant-scoped unless it says otherwise.
 * Use these decorators on a controller or a single handler to relax that:
 *
 *   @RouteAccess.public()         no login needed (health checks, QR page)
 *   @RouteAccess.withoutTenant()  login needed, but no tenant selected (e.g. GET /me)
 */
export class RouteAccess {
  static readonly PUBLIC_KEY = 'route-access:public';
  static readonly WITHOUT_TENANT_KEY = 'route-access:without-tenant';

  static public(): CustomDecorator {
    return SetMetadata(RouteAccess.PUBLIC_KEY, true);
  }

  static withoutTenant(): CustomDecorator {
    return SetMetadata(RouteAccess.WITHOUT_TENANT_KEY, true);
  }
}
