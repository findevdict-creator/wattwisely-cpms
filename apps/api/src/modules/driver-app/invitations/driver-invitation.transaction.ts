import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { DriverInvitationRecord } from '../../drivers/accounts/driver-invitation-record';
import { DriverInvitationsRepository } from '../../drivers/accounts/driver-invitations.repository';
import { InvitationToken } from '../../team/invitation-token';
import { DriverAppErrors } from '../driver-app-errors';

/**
 * Opens a transaction for whoever holds a driver invitation link (module 19): Postgres shows
 * them that one invitation, then the transaction switches to its tenant so the driver row
 * can be linked and the audit entry written there.
 */
@Injectable()
export class DriverInvitationTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly invitations: DriverInvitationsRepository,
  ) {}

  async run<T>(
    token: string,
    work: (tx: Transaction, invitation: DriverInvitationRecord) => Promise<T>,
  ): Promise<T> {
    const hash = InvitationToken.hashOf(token);
    return this.runner.run(DatabaseSession.forInvitation(hash), async (tx) => {
      const target = await this.invitations.findTargetByTokenHash(tx, hash);
      if (!target) {
        throw DriverAppErrors.invitationNotFound();
      }
      await TransactionRunner.switchTenant(tx, target.tenantId);
      const invitation = await this.invitations.findById(tx, target.id);
      return work(tx, invitation as DriverInvitationRecord);
    });
  }
}
