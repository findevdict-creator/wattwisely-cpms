import { HttpStatus, Injectable } from '@nestjs/common';
import { StaffAccount } from '../account/staff-account';
import { ExpiringCache } from '../cache/expiring-cache';
import { DatabaseSession } from '../database/database-session';
import { TransactionRunner } from '../database/transaction-runner';
import { UuidV7 } from '../database/uuid-v7';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from './tenant-access';
import { ActiveMembership, TenantAccessRepository } from './tenant-access.repository';

/**
 * Picks the tenant for a request and loads the caller's access to it (stories ACC-03, ACC-04).
 * - With an X-Tenant-Id header: the caller must be an active member, otherwise 404,
 *   so a stranger cannot even learn that a tenant exists.
 * - Without the header: allowed only when the caller is active in exactly one tenant.
 *
 * Access is cached for 30 seconds per person and tenant. A change made on this
 * instance clears the cache at once (forget); other instances see it within 30 seconds.
 * That is how removing a member ends their access within 60 seconds while they stay logged in.
 */
@Injectable()
export class TenantAccessResolver {
  static readonly HEADER = 'x-tenant-id';
  static readonly CACHE_MS = 30_000;

  private readonly cache = new ExpiringCache<TenantAccess>(TenantAccessResolver.CACHE_MS);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly repository: TenantAccessRepository,
  ) {}

  async resolve(
    account: StaffAccount,
    header: string | string[] | undefined,
  ): Promise<TenantAccess> {
    const requestedTenantId = Array.isArray(header) ? header[0] : header;
    if (requestedTenantId) {
      return this.requireAccess(account, requestedTenantId);
    }
    const memberships = await this.listTenants(account);
    if (memberships.length === 1) {
      return this.requireAccess(account, memberships[0].tenant.id);
    }
    if (memberships.length === 0) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'no_tenant',
        'You are not a member of any company. Ask an Owner to invite you.',
      );
    }
    throw new ProblemException(
      HttpStatus.BAD_REQUEST,
      'tenant_required',
      'Choose a tenant with the X-Tenant-Id header.',
    );
  }

  /** Clears the cached access of one person, after their membership or roles change. */
  forget(userAccountId: string): void {
    this.cache.deleteByPrefix(`${userAccountId}:`);
  }

  private async requireAccess(account: StaffAccount, tenantId: string): Promise<TenantAccess> {
    const access = UuidV7.isUuid(tenantId) ? await this.load(account, tenantId) : null;
    if (!access) {
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'tenant_not_found',
        'This tenant does not exist.',
      );
    }
    return access;
  }

  private async load(account: StaffAccount, tenantId: string): Promise<TenantAccess | null> {
    const cacheKey = `${account.id}:${tenantId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const access = await this.transactionRunner.run(
      DatabaseSession.forTenant(tenantId, account.id),
      async (tx) => {
        const [membership] = await this.repository.findActiveMemberships(tx, account.id, tenantId);
        if (!membership) {
          return null;
        }
        const grants = await this.repository.findGrants(tx, membership.membershipId);
        return new TenantAccess(membership.membershipId, membership.tenant, grants);
      },
    );
    if (access) {
      this.cache.set(cacheKey, access);
    }
    return access;
  }

  private async listTenants(account: StaffAccount): Promise<ActiveMembership[]> {
    return this.transactionRunner.run(DatabaseSession.forUser(account.id), (tx) =>
      this.repository.findActiveMemberships(tx, account.id),
    );
  }
}
