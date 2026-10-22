import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ProblemException } from '../problem/problem.exception';
import { TenantMembership } from './tenant-membership';

/**
 * Picks the tenant for a request (story ACC-04).
 * - With an X-Tenant-Id header: it must be one of the caller's memberships.
 *   Anything else answers 404, so a stranger cannot even learn that a tenant exists.
 * - Without the header: allowed only when the caller belongs to exactly one tenant.
 */
@Injectable()
export class TenantMembershipResolver {
  static readonly HEADER = 'x-tenant-id';

  resolve(user: AuthenticatedUser, header: string | string[] | undefined): TenantMembership {
    const requestedTenantId = Array.isArray(header) ? header[0] : header;
    if (requestedTenantId) {
      return this.requireMembership(user, requestedTenantId);
    }
    if (user.memberships.length === 1) {
      return user.memberships[0];
    }
    throw new ProblemException(
      HttpStatus.BAD_REQUEST,
      'tenant_required',
      'Choose a tenant with the X-Tenant-Id header.',
    );
  }

  private requireMembership(user: AuthenticatedUser, tenantId: string): TenantMembership {
    const membership = user.findMembership(tenantId);
    if (!membership) {
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'tenant_not_found',
        'This tenant does not exist.',
      );
    }
    return membership;
  }
}
