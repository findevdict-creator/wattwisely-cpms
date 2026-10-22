import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RouteAccess } from './route-access.decorator';

/** Tells the guards which RouteAccess markers the current route carries. */
@Injectable()
export class RouteAccessReader {
  constructor(private readonly reflector: Reflector) {}

  isPublic(context: ExecutionContext): boolean {
    return this.hasMarker(RouteAccess.PUBLIC_KEY, context);
  }

  isWithoutTenant(context: ExecutionContext): boolean {
    return this.hasMarker(RouteAccess.WITHOUT_TENANT_KEY, context);
  }

  private hasMarker(key: string, context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]) ===
      true
    );
  }
}
