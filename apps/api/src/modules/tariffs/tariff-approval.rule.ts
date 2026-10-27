import { HttpStatus, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ProblemException } from '../../common/problem/problem.exception';
import { RequestAuth } from '../../common/request/request-auth';
import { ManagedServiceNotifier, PendingMail } from '../managed/mail/managed-service.notifier';
import { ManagedServiceLookup } from '../managed/managed-service.lookup';

/**
 * Story MGT-03: when the managed service agreement says so, a Managed operator's price
 * change is a proposal for the Owner instead of a change. When it does not, the change
 * goes through and the Owners hear about it by e-mail.
 */
@Injectable()
export class TariffApprovalRule {
  constructor(
    private readonly managed: ManagedServiceLookup,
    private readonly notifier: ManagedServiceNotifier,
  ) {}

  /** Inside the change's transaction: 403 when the caller has to propose instead. */
  async requireDirectChange(tx: Transaction, auth: RequestAuth): Promise<void> {
    if (await this.managed.isTariffApprovalRequired(tx, auth.requireAccess())) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'tariff_approval_required',
        'Under the managed service agreement, price changes need the Owner’s approval. Propose the change instead.',
      );
    }
  }

  /** After a Managed operator's change committed: the Owners get an e-mail. */
  async notifyOwners(
    tx: Transaction,
    auth: RequestAuth,
    tariff: { id: string; name: string },
  ): Promise<PendingMail> {
    if (!auth.requireAccess().isManagedOperator) {
      return async () => undefined;
    }
    return this.notifier.tariffChanged(tx, auth.requireAccess().tenant.id, tariff);
  }
}
