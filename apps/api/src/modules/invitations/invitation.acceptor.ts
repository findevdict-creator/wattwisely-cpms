import { HttpStatus, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ProblemException } from '../../common/problem/problem.exception';
import { RequestAuth } from '../../common/request/request-auth';
import { MemberChangeRecorder } from '../team/member-change.recorder';
import { MembershipsWriter } from '../team/memberships.writer';
import { InvitationPreviewDto } from './dto/invitation-preview.dto';
import { InvitationRecord } from './invitation-record';

/**
 * What happens to an invitation inside its tenant's transaction: the preview the page shows,
 * and the acceptance, with its checks (not expired, the caller is the person invited), the
 * status change and the entry in the tenant's audit log. Shared by the two ways of
 * accepting (by link, from /v1/me).
 */
@Injectable()
export class InvitationAcceptor {
  constructor(
    private readonly writer: MembershipsWriter,
    private readonly changes: MemberChangeRecorder,
  ) {}

  async preview(tx: Transaction, invitation: InvitationRecord): Promise<InvitationPreviewDto> {
    const member = await this.writer.reload(tx, invitation.membershipId);
    return new InvitationPreviewDto(invitation, member);
  }

  async accept(tx: Transaction, auth: RequestAuth, found: InvitationRecord): Promise<void> {
    InvitationAcceptor.checkAcceptable(found, auth.requireAccount().id);
    const before = await this.writer.reload(tx, found.membershipId);
    await this.writer.activate(tx, found.membershipId);
    const after = await this.writer.reload(tx, found.membershipId);
    const change = { before, after, tenantId: found.tenantId };
    await this.changes.record(tx, auth, 'invitation_accepted', change);
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
}
