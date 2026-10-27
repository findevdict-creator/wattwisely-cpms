import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { UserAccountsRepository } from '../../common/account/user-accounts.repository';
import { PlanLimits } from '../../common/entitlements/plan-limits';
import { RequestAuth } from '../../common/request/request-auth';
import { InviteMemberRequestDto } from './dto/invite-member-request.dto';
import { InvitationToken } from './invitation-token';
import { MemberRecord } from './member-record';
import { MembersRepository } from './members.repository';
import { InvitationDetails, MembershipsWriter } from './memberships.writer';
import { RoleAssignment } from './role-assignment';
import { RoleAssignmentPolicy } from './role-assignment.policy';
import { TeamErrors } from './team-errors';

/** A membership before and after a change, for the audit log. */
export interface MemberChange {
  before: MemberRecord | null;
  after: MemberRecord;
}

/**
 * Saves new and renewed invitations inside the caller's transaction (story ACC-02).
 * A new seat must fit the plan's user limit (module 9).
 */
@Injectable()
export class InvitationSaver {
  constructor(
    private readonly accounts: UserAccountsRepository,
    private readonly members: MembersRepository,
    private readonly writer: MembershipsWriter,
    private readonly policy: RoleAssignmentPolicy,
  ) {}

  async create(
    tx: Transaction,
    auth: RequestAuth,
    request: InviteMemberRequestDto,
    token: InvitationToken,
  ): Promise<MemberChange> {
    const access = auth.requireAccess();
    const assignments = RoleAssignment.fromRequest(request.roles);
    await this.policy.check(tx, assignments, access.permissions);
    const account = await this.accounts.findOrCreateByEmail(tx, request.email.trim());
    const before = await this.members.findByAccount(tx, account.id);
    if (before?.status !== 'invited') {
      await PlanLimits.ensureUserRoom(tx, access);
    }
    const details = InvitationSaver.details(auth, token);
    const id = before
      ? await this.reopen(tx, before, details)
      : await this.writer.createInvitation(tx, access.tenant.id, account.id, details);
    const membership = { tenantId: access.tenant.id, id };
    await this.writer.replaceRoles(tx, membership, assignments, details.invitedBy);
    return { before, after: await this.writer.reload(tx, id) };
  }

  /** A fresh link for a pending invitation; the old link stops working. */
  async renew(tx: Transaction, memberId: string, token: InvitationToken): Promise<MemberChange> {
    const before = await this.writer.requireMember(tx, memberId, ['invited']);
    await this.writer.renewInvitation(tx, memberId, token.hash, InvitationToken.expiresAt());
    return { before, after: await this.writer.reload(tx, memberId) };
  }

  private async reopen(
    tx: Transaction,
    existing: MemberRecord,
    details: InvitationDetails,
  ): Promise<string> {
    if (existing.status === 'active') {
      throw TeamErrors.alreadyMember();
    }
    if (existing.status === 'invited') {
      throw TeamErrors.alreadyInvited();
    }
    await this.writer.reopenInvitation(tx, existing.id, details);
    return existing.id;
  }

  private static details(auth: RequestAuth, token: InvitationToken): InvitationDetails {
    return {
      invitedBy: auth.requireAccount().id,
      tokenHash: token.hash,
      expiresAt: InvitationToken.expiresAt(),
    };
  }
}
