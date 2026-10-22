import { Injectable } from '@nestjs/common';
import { DatabaseSession } from '../../common/database/database-session';
import { Transaction, TransactionRunner } from '../../common/database/transaction-runner';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccessResolver } from '../../common/tenant/tenant-access.resolver';

/**
 * Runs a team change in one transaction in the caller's tenant. After it commits,
 * the changed person's cached access is dropped, so this API instance applies the
 * change on their next request and every other instance within 30 seconds.
 */
@Injectable()
export class TeamTransaction {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  async run<T extends { userAccountId: string }>(
    auth: RequestAuth,
    work: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const session = DatabaseSession.forTenant(
      auth.requireAccess().tenant.id,
      auth.requireAccount().id,
    );
    const changed = await this.transactionRunner.run(session, work);
    this.accessResolver.forget(changed.userAccountId);
    return changed;
  }
}
