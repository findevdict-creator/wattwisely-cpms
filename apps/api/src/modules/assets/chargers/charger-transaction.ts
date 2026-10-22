import { Injectable } from '@nestjs/common';
import { DatabaseErrors, DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssetChangeRecorder } from '../asset-change.recorder';
import { AssetErrors } from '../asset-errors';
import { ChargerRecord } from './charger-record';
import { ChargerSnapshot } from './charger-snapshot';

/**
 * Runs a charger change in the caller's tenant and turns the unique indexes that may
 * trip into the API's own problems. Shared by registration and later changes.
 */
@Injectable()
export class ChargerTransaction {
  static readonly IDENTITY_INDEX = 'chargers_identity_unique';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly changes: AssetChangeRecorder,
  ) {}

  async run<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    const session = DatabaseSession.forTenant(auth.requireAccess().tenant.id);
    try {
      return await this.transactionRunner.run(session, work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === ChargerTransaction.IDENTITY_INDEX) {
        throw AssetErrors.identityTaken();
      }
      throw error;
    }
  }

  record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: ChargerRecord | null; after: ChargerRecord | null },
  ): Promise<void> {
    const charger = (change.after ?? change.before) as ChargerRecord;
    return this.changes.record(tx, auth, action, {
      target: { type: 'charger', id: charger.id, label: charger.ocppIdentity },
      before: ChargerSnapshot.of(change.before),
      after: ChargerSnapshot.of(change.after),
    });
  }
}
