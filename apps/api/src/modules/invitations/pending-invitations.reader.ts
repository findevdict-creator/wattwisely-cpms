import { Injectable } from '@nestjs/common';
import { Transaction, TransactionRunner } from '@wattwisely/db';
import { StaffAccount } from '../../common/account/staff-account';
import { MembersRepository } from '../team/members.repository';
import { PendingInvitationDto } from './dto/pending-invitation.dto';
import { InvitationRecord } from './invitation-record';
import { InvitationsRepository } from './invitations.repository';

/**
 * The invitations waiting for a person, for GET /v1/me: whoever verified the invited e-mail
 * address and logged in may see and accept them without the link from the e-mail, which is
 * lost when the sign-up ends in another browser tab. Runs inside the caller's own
 * transaction (DatabaseSession.forUser); the roles are read inside each tenant in turn.
 */
@Injectable()
export class PendingInvitationsReader {
  constructor(
    private readonly invitations: InvitationsRepository,
    private readonly members: MembersRepository,
  ) {}

  async listFor(tx: Transaction, account: StaffAccount): Promise<PendingInvitationDto[]> {
    const pending = await this.invitations.findPendingForAccount(tx, account.id, new Date());
    const dtos: PendingInvitationDto[] = [];
    for (const invitation of pending) {
      dtos.push(await this.describe(tx, invitation));
    }
    return dtos;
  }

  private async describe(tx: Transaction, invitation: InvitationRecord) {
    await TransactionRunner.switchTenant(tx, invitation.tenantId);
    const member = await this.members.findById(tx, invitation.membershipId);
    return new PendingInvitationDto(invitation, member?.grants ?? [], member?.invitedByName);
  }
}
