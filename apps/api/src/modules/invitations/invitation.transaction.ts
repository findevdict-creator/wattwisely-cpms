import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession } from '../../common/database/database-session';
import { Transaction, TransactionRunner } from '../../common/database/transaction-runner';
import { ProblemException } from '../../common/problem/problem.exception';
import { InvitationToken } from '../team/invitation-token';
import { InvitationRecord } from './invitation-record';
import { InvitationsRepository } from './invitations.repository';

/**
 * Opens a transaction for whoever holds an invitation link: Postgres shows them
 * that one invitation, then the transaction switches to its tenant so its roles
 * can be read and the membership updated.
 */
@Injectable()
export class InvitationTransaction {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly invitations: InvitationsRepository,
  ) {}

  async run<T>(
    token: string,
    work: (tx: Transaction, invitation: InvitationRecord) => Promise<T>,
  ): Promise<T> {
    const hash = InvitationToken.hashOf(token);
    return this.transactionRunner.run(DatabaseSession.forInvitation(hash), async (tx) => {
      const invitation = await this.invitations.findByTokenHash(tx, hash);
      if (!invitation) {
        throw new ProblemException(
          HttpStatus.NOT_FOUND,
          'invitation_not_found',
          'This invitation was already used or cancelled. Ask for a new one.',
        );
      }
      await TransactionRunner.switchTenant(tx, invitation.tenantId);
      return work(tx, invitation);
    });
  }
}
