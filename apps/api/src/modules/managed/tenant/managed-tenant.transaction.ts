import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccessResolver } from '../../../common/tenant/tenant-access.resolver';

/**
 * Runs the tenant's managed service work in one transaction in its tenant. After a change
 * commits, every member's cached access is dropped, so the tier shows at once on this API
 * instance and within 30 seconds on the others.
 */
@Injectable()
export class ManagedTenantTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  read<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(ManagedTenantTransaction.sessionOf(auth), work);
  }

  async change<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    const result = await this.runner.run(ManagedTenantTransaction.sessionOf(auth), work);
    this.accessResolver.forgetTenant(auth.requireAccess().tenant.id);
    return result;
  }

  private static sessionOf(auth: RequestAuth): DatabaseSession {
    return DatabaseSession.forTenant(auth.requireAccess().tenant.id, auth.requireAccount().id);
  }
}
