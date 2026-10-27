import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { StaffAccountResolver } from '../account/staff-account.resolver';
import { UserAccountsRepository } from '../account/user-accounts.repository';
import { PermissionGuard } from '../permissions/permission.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { PlatformAccessRepository } from '../platform/platform-access.repository';
import { PlatformAccessResolver } from '../platform/platform-access.resolver';
import { PlatformTransaction } from '../platform/platform-transaction';
import { TenantAccessRepository } from '../tenant/tenant-access.repository';
import { TenantAccessResolver } from '../tenant/tenant-access.resolver';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { AuthenticatedUserFactory } from './authenticated-user.factory';
import { AuthenticationGuard } from './authentication.guard';
import { BearerTokenExtractor } from './bearer-token.extractor';
import { KeycloakKeySetProvider } from './keycloak-key-set.provider';
import { KeycloakTokenVerifier } from './keycloak-token.verifier';
import { RouteAccessReader } from './route-access.reader';

/**
 * Registers the global guards that run, in this order, before every controller:
 *   0. RateLimitGuard       - has this address used up its budget? (module 12)
 *   1. AuthenticationGuard  - who is calling? (token)
 *   2. TenantContextGuard   - which account and tenant, or which staff role? (database)
 *   3. PermissionGuard      - may they do this? (roles, and the tenant's plan)
 */
@Global()
@Module({
  providers: [
    KeycloakKeySetProvider,
    KeycloakTokenVerifier,
    BearerTokenExtractor,
    AuthenticatedUserFactory,
    RouteAccessReader,
    UserAccountsRepository,
    StaffAccountResolver,
    TenantAccessRepository,
    TenantAccessResolver,
    PlatformAccessRepository,
    PlatformAccessResolver,
    PlatformTransaction,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [
    KeycloakKeySetProvider,
    UserAccountsRepository,
    TenantAccessRepository,
    TenantAccessResolver,
    PlatformAccessResolver,
    PlatformTransaction,
  ],
})
export class AuthModule {}
