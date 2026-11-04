import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { StaffAccount } from '../../common/account/staff-account';
import { InvitationRecord } from './invitation-record';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';

/**
 * Opens a transaction for a person accepting one of their own invitations without its link
 * (from the list on /v1/me): Postgres shows them their own memberships, the invitation is
 * found by its membership id, then the transaction switches to its tenant so its roles can
 * be read and the membership updated.
 */
@Injectable()
export class PendingInvitationTransaction {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly invitations: InvitationsRepository,
  ) {}

  async run<T>(
    account: StaffAccount,
    membershipId: string,
    work: (tx: Transaction, invitation: InvitationRecord) => Promise<T>,
  ): Promise<T> {
    return this.transactionRunner.run(DatabaseSession.forUser(account.id), async (tx) => {
      const invitation = await this.invitations.findPendingById(tx, account.id, membershipId);
      if (!invitation) {
        throw InvitationsService.notFound();
      }
      await TransactionRunner.switchTenant(tx, invitation.tenantId);
      return work(tx, invitation);
    });
  }
}
