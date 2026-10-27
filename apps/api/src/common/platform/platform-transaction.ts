import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { RequestAuth } from '../request/request-auth';
import { TenantAccessResolver } from '../tenant/tenant-access.resolver';

/**
 * Runs admin console work in one transaction with platform access (module 9): the global
 * tables and every tenant's plan rows are visible and writable, a tenant's own data is not.
 * `runInTenant` adds one tenant, for what staff do to it: its plan and modules, its first
 * Owner, its audit log. Afterwards the tenant's members lose their cached access, so a
 * plan change reaches them on their next request (other API instances within 30 seconds).
 */
@Injectable()
export class PlatformTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  run<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forPlatform(auth.requireAccount().id), work);
  }

  async runInTenant<T>(
    auth: RequestAuth,
    tenantId: string,
    work: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const session = DatabaseSession.forPlatformInTenant(tenantId, auth.requireAccount().id);
    try {
      return await this.runner.run(session, work);
    } finally {
      this.accessResolver.forgetTenant(tenantId);
    }
  }
}
