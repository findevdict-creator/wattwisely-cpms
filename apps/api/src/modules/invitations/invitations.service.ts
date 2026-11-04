import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccessResolver } from '../../common/tenant/tenant-access.resolver';
import { TenantSummary } from '../../common/tenant/tenant-summary';
import { AcceptedInvitationDto } from './dto/accepted-invitation.dto';
import { InvitationPreviewDto } from './dto/invitation-preview.dto';
import { InvitationRecord } from './invitation-record';
import { InvitationAcceptor } from './invitation.acceptor';
import { InvitationTransaction } from './invitation.transaction';
import { PendingInvitationTransaction } from './pending-invitation.transaction';

/**
 * The invitee's side of story ACC-02: look at an invitation from its link, then accept it.
 * Accepting needs a login with the same e-mail address the invitation was sent to. Someone
 * who lost the link accepts from the list on /v1/me instead (the "No workspace yet" page).
 */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly byLink: InvitationTransaction,
    private readonly byId: PendingInvitationTransaction,
    private readonly acceptor: InvitationAcceptor,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  preview(token: string): Promise<InvitationPreviewDto> {
    return this.byLink.run(token, (tx, invitation) => this.acceptor.preview(tx, invitation));
  }

  async accept(auth: RequestAuth, token: string): Promise<AcceptedInvitationDto> {
    const invitation = await this.byLink.run(token, async (tx, found) => {
      await this.acceptor.accept(tx, auth, found);
      return found;
    });
    return this.accepted(auth, invitation);
  }

  /** Accepts one of the caller's own pending invitations, named by its membership id. */
  async acceptPending(auth: RequestAuth, membershipId: string): Promise<AcceptedInvitationDto> {
    const account = auth.requireAccount();
    const invitation = await this.byId.run(account, membershipId, async (tx, found) => {
      await this.acceptor.accept(tx, auth, found);
      return found;
    });
    return this.accepted(auth, invitation);
  }

  /** After the transaction committed: the person's tenants changed, so the cache forgets them. */
  private accepted(auth: RequestAuth, invitation: InvitationRecord): AcceptedInvitationDto {
    this.accessResolver.forget(auth.requireAccount().id);
    return new AcceptedInvitationDto(InvitationsService.tenantOf(invitation));
  }

  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'invitation_not_found',
      'This invitation was already used or cancelled. Ask for a new one.',
    );
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
