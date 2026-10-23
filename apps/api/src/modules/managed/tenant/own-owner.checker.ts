import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ManagedOperatorsRepository } from '../managed-operators.repository';
import { OwnerContactsRepository } from '../mail/owner-contacts.repository';
import { ManagedServiceErrors } from '../managed-service-errors';

/**
 * Before notice is given (story MGT-05): the tenant must have an Owner of its own, who is
 * not Wattwisely staff working in it, so somebody runs the account when the service ends.
 */
@Injectable()
export class OwnOwnerChecker {
  constructor(
    private readonly owners: OwnerContactsRepository,
    private readonly operators: ManagedOperatorsRepository,
  ) {}

  async require(tx: Transaction, tenantId: string): Promise<void> {
    const owners = await this.owners.findActiveOwners(tx);
    const operators = await this.operators.findActive(tx, tenantId);
    const staffIds = new Set(operators.map((operator) => operator.userAccountId));
    if (!owners.some((owner) => !staffIds.has(owner.userAccountId))) {
      throw ManagedServiceErrors.ownOwnerRequired();
    }
  }
}
