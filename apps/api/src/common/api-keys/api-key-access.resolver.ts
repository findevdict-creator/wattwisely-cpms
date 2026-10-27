import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { StaffAccount } from '../account/staff-account';
import { ExpiringCache } from '../cache/expiring-cache';
import { TenantEntitlementsRepository } from '../entitlements/tenant-entitlements.repository';
import { ModuleCatalog } from '../permissions/module-catalog';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';
import { TenantAccessRepository } from '../tenant/tenant-access.repository';
import { ApiKeyAccessRepository, ApiKeyLookupRow } from './api-key-access.repository';
import { ApiKeyErrors } from './api-key-errors';
import { ApiKeyPrincipal } from './api-key-principal';
import { ApiKeyToken } from './api-key-token';

/** What a request with an API key gets: the key, and its access to its tenant. */
export interface ResolvedApiKey {
  principal: ApiKeyPrincipal;
  access: TenantAccess;
}

/**
 * Turns a `wwk_…` bearer token into the key behind it and its access (module 16): the key is
 * found by the token's hash, must be live (not revoked, not expired) in a tenant that is open
 * and whose plan includes the api_keys module, and gets a TenantAccess with the permissions
 * chosen when it was made. Cached for 30 seconds per key, like a person's access (module 2);
 * revoking a key drops the tenant's cached keys on this instance at once.
 */
@Injectable()
export class ApiKeyAccessResolver {
  static readonly CACHE_MS = 30_000;
  static readonly MODULE_KEY = 'api_keys';
  static readonly ROLE_KEY = 'api_key';

  private readonly cache = new ExpiringCache<ResolvedApiKey>(ApiKeyAccessResolver.CACHE_MS);

  constructor(
    private readonly runner: TransactionRunner,
    private readonly keys: ApiKeyAccessRepository,
    private readonly tenants: TenantAccessRepository,
    private readonly entitlements: TenantEntitlementsRepository,
  ) {}

  async resolve(token: string, now: Date = new Date()): Promise<ResolvedApiKey> {
    const hash = ApiKeyToken.hashOf(token);
    const cached = this.cache.get(hash);
    if (cached) {
      return cached;
    }
    const row = await this.runner.run(DatabaseSession.forApiKey(hash), (tx) =>
      this.lookup(tx, hash, now),
    );
    const resolved = await this.runner.run(
      DatabaseSession.forTenant(row.tenantId, row.account.id),
      (tx) => this.load(tx, row),
    );
    this.cache.set(hash, resolved);
    return resolved;
  }

  /** Clears the cached keys of one tenant, after a key was revoked or the plan changed. */
  forgetTenant(tenantId: string): void {
    this.cache.deleteWhere((_hash, resolved) => resolved.principal.tenantId === tenantId);
  }

  private async lookup(tx: Transaction, hash: string, now: Date): Promise<ApiKeyLookupRow> {
    const row = await this.keys.findByHash(tx, hash);
    if (!row) {
      throw ApiKeyErrors.invalid();
    }
    if (row.revokedAt) {
      throw ApiKeyErrors.revoked();
    }
    if (row.expiresAt && row.expiresAt <= now) {
      throw ApiKeyErrors.expired();
    }
    await this.keys.touch(tx, row.id, now);
    return row;
  }

  private async load(tx: Transaction, row: ApiKeyLookupRow): Promise<ResolvedApiKey> {
    const tenant = await this.tenants.findTenant(tx, row.tenantId);
    if (!tenant) {
      throw ApiKeyErrors.invalid();
    }
    const entitlements = await this.entitlements.load(tx, row.tenantId);
    if (entitlements.isModuleLocked(ApiKeyAccessResolver.MODULE_KEY)) {
      throw ApiKeyAccessResolver.locked();
    }
    const account = new StaffAccount(row.account.id, row.account.email, row.account.name);
    const grant = {
      roleId: row.id,
      roleKey: ApiKeyAccessResolver.ROLE_KEY,
      roleName: row.name,
      siteId: null,
      permissionKeys: row.permissionKeys,
    };
    return {
      principal: new ApiKeyPrincipal(row.id, row.name, row.tenantId, account),
      access: new TenantAccess(row.id, tenant, [grant], entitlements),
    };
  }

  /** The same answer PermissionGuard gives a person whose plan lacks a module (module 9). */
  private static locked(): ProblemException {
    const module = ModuleCatalog.find(ApiKeyAccessResolver.MODULE_KEY);
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'module_not_in_plan',
      `${module?.name ?? 'This module'} is not part of your plan. Ask Wattwisely to add it.`,
    );
  }
}
