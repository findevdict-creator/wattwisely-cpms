import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverAppErrors } from '../driver-app-errors';
import { OperatorLinkRecord } from '../operators/operator-link-record';
import { OperatorLinksRepository } from '../operators/operator-links.repository';
import { DriverChargeRecord } from './driver-charge-record';
import { DriverChargesRepository } from './driver-charges.repository';

/**
 * A driver's charges live in their operators' tenants (module 19): one transaction first
 * lists the operators the login is linked with, then enters each tenant in turn. A session
 * id that none of them has, or that belongs to someone else, answers 404.
 */
@Injectable()
export class DriverChargeTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly links: OperatorLinksRepository,
    private readonly charges: DriverChargesRepository,
  ) {}

  /** Runs `work` once per linked operator, inside that operator's tenant. */
  async forEachOperator<T>(
    auth: RequestAuth,
    work: (tx: Transaction, link: OperatorLinkRecord) => Promise<T>,
  ): Promise<T[]> {
    const account = auth.requireDriver();
    return this.runner.run(DatabaseSession.forDriverAccount(account.id), async (tx) => {
      const results: T[] = [];
      for (const link of await this.links.findAll(tx, account.id)) {
        await TransactionRunner.switchTenant(tx, link.tenantId);
        results.push(await work(tx, link));
      }
      return results;
    });
  }

  /** Finds one of the driver's charges among their operators and runs `work` inside its tenant. */
  async withCharge<T>(
    auth: RequestAuth,
    sessionId: string,
    work: (tx: Transaction, charge: DriverChargeRecord) => Promise<T>,
  ): Promise<T> {
    const account = auth.requireDriver();
    if (!UuidV7.isUuid(sessionId)) {
      throw DriverAppErrors.chargeNotFound();
    }
    return this.runner.run(DatabaseSession.forDriverAccount(account.id), async (tx) => {
      for (const link of await this.links.findAll(tx, account.id)) {
        await TransactionRunner.switchTenant(tx, link.tenantId);
        const charge = await this.charges.findById(tx, link.driverId, sessionId);
        if (charge) {
          return work(tx, charge);
        }
      }
      throw DriverAppErrors.chargeNotFound();
    });
  }
}
