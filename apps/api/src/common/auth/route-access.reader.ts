import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RouteAccess } from './route-access.decorator';

/** Tells the guards which RouteAccess markers the current route carries. */
@Injectable()
export class RouteAccessReader {
  constructor(private readonly reflector: Reflector) {}

  isPublic(context: ExecutionContext): boolean {
    return this.read<boolean>(RouteAccess.PUBLIC_KEY, context) === true;
  }

  isWithoutTenant(context: ExecutionContext): boolean {
    return this.read<boolean>(RouteAccess.WITHOUT_TENANT_KEY, context) === true;
  }

  /** A /v1/driver route (module 19): a driver's token, and no tenant. */
  isDriver(context: ExecutionContext): boolean {
    return this.read<boolean>(RouteAccess.DRIVER_KEY, context) === true;
  }

  /** The platform permission an admin console route needs, or undefined on tenant routes. */
  requiredPlatformPermission(context: ExecutionContext): string | undefined {
    return this.read<string>(RouteAccess.PLATFORM_KEY, context);
  }

  /** The permission key the route needs, RouteAccess.ANY_MEMBER, or undefined when it declares none. */
  requiredPermission(context: ExecutionContext): string | undefined {
    return this.read<string>(RouteAccess.PERMISSION_KEY, context);
  }

  private read<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T>(key, [context.getHandler(), context.getClass()]);
  }
}
