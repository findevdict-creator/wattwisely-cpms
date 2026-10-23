import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../common/request/request-auth';
import { InviteMemberRequestDto } from './dto/invite-member-request.dto';
import { InviteResultDto } from './dto/invite-result.dto';
import { MemberDto } from './dto/member.dto';
import { InvitationMailer } from './invitation.mailer';
import { InvitationSaver } from './invitation.saver';
import { InvitationToken } from './invitation-token';
import { MemberChangeRecorder } from './member-change.recorder';
import { MemberRecord } from './member-record';
import { TeamTransaction } from './team.transaction';

/**
 * Sending and resending invitations (story ACC-02). The e-mail goes out after the
 * invitation is saved; if the mail server refuses, the invitation stays and can be resent.
 */
@Injectable()
export class MemberInvitesService {
  constructor(
    private readonly teamTransaction: TeamTransaction,
    private readonly saver: InvitationSaver,
    private readonly changes: MemberChangeRecorder,
    private readonly mailer: InvitationMailer,
  ) {}

  async invite(auth: RequestAuth, request: InviteMemberRequestDto): Promise<InviteResultDto> {
    const token = InvitationToken.create();
    const member = await this.teamTransaction.run(auth, async (tx) => {
      const change = await this.saver.create(tx, auth, request, token);
      await this.changes.record(tx, auth, 'member_invited', change);
      return change.after;
    });
    return this.sendEmail(auth, member, token);
  }

  async resend(auth: RequestAuth, memberId: string): Promise<InviteResultDto> {
    const token = InvitationToken.create();
    const member = await this.teamTransaction.run(auth, async (tx) => {
      const change = await this.saver.renew(tx, memberId, token);
      await this.changes.record(tx, auth, 'invitation_resent', change);
      return change.after;
    });
    return this.sendEmail(auth, member, token);
  }

  private async sendEmail(
    auth: RequestAuth,
    member: MemberRecord,
    token: InvitationToken,
  ): Promise<InviteResultDto> {
    const inviter = auth.requireAccount();
    const isSent = await this.mailer.send({
      to: member.email,
      tenantId: auth.requireAccess().tenant.id,
      inviterName: inviter.name || inviter.email,
      roleNames: [...new Set(member.grants.map((grant) => grant.roleName))],
      token: token.value,
      expiresAt: member.inviteExpiresAt as Date,
    });
    return new InviteResultDto(new MemberDto(member), isSent);
  }
}
