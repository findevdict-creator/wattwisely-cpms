import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccessResolver } from '../../common/tenant/tenant-access.resolver';
import { TenantSummary } from '../../common/tenant/tenant-summary';
import { MemberChangeRecorder } from '../team/member-change.recorder';
import { MembershipsWriter } from '../team/memberships.writer';
import { AcceptedInvitationDto } from './dto/accepted-invitation.dto';
import { InvitationPreviewDto } from './dto/invitation-preview.dto';
import { InvitationRecord } from './invitation-record';
import { InvitationTransaction } from './invitation.transaction';

/**
 * The invitee's side of story ACC-02: look at an invitation from its link, then accept it.
 * Accepting needs a login with the same e-mail address the invitation was sent to.
 */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationTransaction: InvitationTransaction,
    private readonly writer: MembershipsWriter,
    private readonly changes: MemberChangeRecorder,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  async preview(token: string): Promise<InvitationPreviewDto> {
    return this.invitationTransaction.run(token, async (tx, invitation) => {
      const member = await this.writer.reload(tx, invitation.membershipId);
      return new InvitationPreviewDto(invitation, member);
    });
  }

  async accept(auth: RequestAuth, token: string): Promise<AcceptedInvitationDto> {
    const account = auth.requireAccount();
    const invitation = await this.invitationTransaction.run(token, async (tx, found) => {
      InvitationsService.checkAcceptable(found, account.id);
      const before = await this.writer.reload(tx, found.membershipId);
      await this.writer.activate(tx, found.membershipId);
      const after = await this.writer.reload(tx, found.membershipId);
      const change = { before, after, tenantId: found.tenantId };
      await this.changes.record(tx, auth, 'invitation_accepted', change);
      return found;
    });
    this.accessResolver.forget(account.id);
    return new AcceptedInvitationDto(InvitationsService.tenantOf(invitation));
  }

  private static checkAcceptable(invitation: InvitationRecord, userAccountId: string): void {
    if ((invitation.expiresAt?.getTime() ?? 0) <= Date.now()) {
      throw new ProblemException(
        HttpStatus.GONE,
        'invitation_expired',
        'This invitation has expired. Ask for a new one.',
      );
    }
    if (invitation.userAccountId !== userAccountId) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'invitation_for_someone_else',
        `This invitation was sent to ${invitation.email}. Log in with that address to accept it.`,
      );
    }
  }

  private static tenantOf(invitation: InvitationRecord): TenantSummary {
    return new TenantSummary({
      id: invitation.tenantId,
      slug: invitation.tenantSlug,
      name: invitation.tenantName,
      status: invitation.tenantStatus,
      serviceTier: 'self_serve',
    });
  }
}
