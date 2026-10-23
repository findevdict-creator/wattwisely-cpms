import { ExecutionContext } from '@nestjs/common';
import { TenantEntitlements } from '../entitlements/tenant-entitlements';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { RequestAuth } from '../request/request-auth';
import { TenantAccess } from '../tenant/tenant-access';
import { TenantSummary } from '../tenant/tenant-summary';
import { PermissionGuard } from './permission.guard';

/** The guard's decisions on a route, with the route's marker and the caller's access given directly. */
describe('PermissionGuard', () => {
  const ownerGrant = {
    roleId: 'r1',
    roleKey: 'owner',
    roleName: 'Owner',
    siteId: null,
    permissionKeys: ['reports:read', 'reports:schedule', 'sites:write'],
  };

  const guard = (route: { permission?: string; platform?: string }) =>
    new PermissionGuard({
      isPublic: () => false,
      isWithoutTenant: () => false,
      requiredPermission: () => route.permission,
      requiredPlatformPermission: () => route.platform,
    } as unknown as RouteAccessReader);

  const contextFor = (auth: RequestAuth) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ auth, method: 'GET', url: '/v1/x' }) }),
    }) as unknown as ExecutionContext;

  const authWith = (
    entitlements: TenantEntitlements,
    status: TenantSummary['status'] = 'active',
  ) => {
    const tenant = new TenantSummary('t1', 'acme', 'Acme', status);
    const access = new TenantAccess('m1', tenant, [ownerGrant], entitlements);
    return new RequestAuth({} as RequestAuth['user'], {} as RequestAuth['origin'], { access });
  };

  const codeOf = (work: () => unknown) => {
    try {
      work();
      return 'allowed';
    } catch (error) {
      return (error as ProblemException).code;
    }
  };

  it('lets a core permission through and refuses one whose module the plan lacks', () => {
    const auth = authWith(TenantEntitlements.none());

    expect(codeOf(() => guard({ permission: 'reports:read' }).canActivate(contextFor(auth)))).toBe(
      'allowed',
    );
    expect(
      codeOf(() => guard({ permission: 'reports:schedule' }).canActivate(contextFor(auth))),
    ).toBe('module_not_in_plan');
  });

  it('checks the role before the plan, and the plan before the suspension', () => {
    const suspended = authWith(TenantEntitlements.none(), 'suspended');

    expect(
      codeOf(() => guard({ permission: 'team:manage' }).canActivate(contextFor(suspended))),
    ).toBe('permission_denied');
    expect(
      codeOf(() => guard({ permission: 'sites:write' }).canActivate(contextFor(suspended))),
    ).toBe('tenant_suspended');
  });

  it('refuses an admin console route to anyone without a staff role', () => {
    const auth = authWith(TenantEntitlements.none());

    expect(codeOf(() => guard({ platform: 'tenants:read' }).canActivate(contextFor(auth)))).toBe(
      'not_platform_staff',
    );
  });
});
