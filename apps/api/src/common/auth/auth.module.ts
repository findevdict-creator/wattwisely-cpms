import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { TenantMembershipResolver } from '../tenant/tenant-membership.resolver';
import { AuthenticatedUserFactory } from './authenticated-user.factory';
import { AuthenticationGuard } from './authentication.guard';
import { BearerTokenExtractor } from './bearer-token.extractor';
import { KeycloakKeySetProvider } from './keycloak-key-set.provider';
import { KeycloakTokenVerifier } from './keycloak-token.verifier';
import { OrganizationClaimParser } from './organization-claim.parser';
import { RouteAccessReader } from './route-access.reader';

/**
 * Registers the two global guards that run, in this order, before every controller:
 *   1. AuthenticationGuard  - who is calling?
 *   2. TenantContextGuard   - which tenant are they working in?
 * Permissions (what may they do) are added in module 2.
 */
@Global()
@Module({
  providers: [
    KeycloakKeySetProvider,
    KeycloakTokenVerifier,
    BearerTokenExtractor,
    OrganizationClaimParser,
    AuthenticatedUserFactory,
    RouteAccessReader,
    TenantMembershipResolver,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
  ],
  exports: [KeycloakKeySetProvider],
})
export class AuthModule {}
