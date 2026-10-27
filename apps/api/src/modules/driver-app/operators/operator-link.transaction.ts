import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverAppErrors } from '../driver-app-errors';
import { OperatorLinkRecord } from './operator-link-record';
import { OperatorLinksRepository } from './operator-links.repository';

/**
 * Opens a transaction for a driver working with one of their operators (module 19): Postgres
 * first shows the driver their own linked rows, the link to that operator is checked, then
 * the transaction switches into the operator's tenant so its groups and cards can be read
 * and the driver row changed. A tenant the driver is not linked with answers 404.
 */
@Injectable()
export class OperatorLinkTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly links: OperatorLinksRepository,
  ) {}

  /** Every operator the driver is linked with, without entering any tenant. */
  listAll(auth: RequestAuth): Promise<OperatorLinkRecord[]> {
    const account = auth.requireDriver();
    return this.runner.run(DatabaseSession.forDriverAccount(account.id), (tx) =>
      this.links.findAll(tx, account.id),
    );
  }

  async run<T>(
    auth: RequestAuth,
    tenantId: string,
    work: (tx: Transaction, link: OperatorLinkRecord) => Promise<T>,
  ): Promise<T> {
    const account = auth.requireDriver();
    return this.runner.run(DatabaseSession.forDriverAccount(account.id), async (tx) => {
      const link = UuidV7.isUuid(tenantId)
        ? await this.links.findByTenant(tx, account.id, tenantId)
        : null;
      if (!link) {
        throw DriverAppErrors.operatorNotFound();
      }
      await TransactionRunner.switchTenant(tx, link.tenantId);
      return work(tx, link);
    });
  }
}
