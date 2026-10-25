import { Injectable } from '@nestjs/common';
import { DatabaseErrors } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverInvitationRecord } from '../../drivers/accounts/driver-invitation-record';
import { DriverInvitationsRepository } from '../../drivers/accounts/driver-invitations.repository';
import { DriverAppErrors } from '../driver-app-errors';
import { DriverLinkWriter } from '../driver-link.writer';
import { DriverOperatorDto } from '../operators/dto/driver-operator.dto';
import { OperatorLinksRepository } from '../operators/operator-links.repository';
import { DriverInvitationTransaction } from './driver-invitation.transaction';
import { AcceptedDriverInvitationDto } from './dto/accepted-driver-invitation.dto';
import { DriverInvitationPreviewDto } from './dto/driver-invitation-preview.dto';

/**
 * The driver's side of an invitation (module 19, story DRV-04): look at it from the link,
 * then accept it with a login whose verified address is the one it was sent to, or decline.
 * Accepting links the operator's driver record to the account; the operator sees the link at once.
 */
@Injectable()
export class DriverInvitationsService {
  static readonly ACCOUNT_INDEX = 'drivers_account_unique';

  constructor(
    private readonly transaction: DriverInvitationTransaction,
    private readonly invitations: DriverInvitationsRepository,
    private readonly links: OperatorLinksRepository,
    private readonly writer: DriverLinkWriter,
  ) {}

  preview(token: string): Promise<DriverInvitationPreviewDto> {
    return this.transaction.run(
      token,
      async (_tx, invitation) => new DriverInvitationPreviewDto(invitation),
    );
  }

  async accept(auth: RequestAuth, token: string): Promise<AcceptedDriverInvitationDto> {
    const account = auth.requireDriver();
    try {
      return await this.transaction.run(token, async (tx, invitation) => {
        DriverInvitationsService.checkAcceptable(invitation, account.email);
        await this.invitations.close(tx, invitation.id, 'accepted');
        await this.writer.apply(tx, auth, {
          ...invitation,
          action: 'invitation_accepted',
          accountId: account.id,
        });
        const link = await this.links.findByTenant(tx, account.id, invitation.tenantId);
        return new AcceptedDriverInvitationDto(new DriverOperatorDto(link as NonNullable<typeof link>));
      });
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === DriverInvitationsService.ACCOUNT_INDEX) {
        throw DriverAppErrors.accountAlreadyLinked();
      }
      throw error;
    }
  }

  async decline(auth: RequestAuth, token: string): Promise<void> {
    const account = auth.requireDriver();
    await this.transaction.run(token, async (tx, invitation) => {
      DriverInvitationsService.checkAcceptable(invitation, account.email);
      await this.invitations.close(tx, invitation.id, 'declined');
      await this.writer.apply(tx, auth, { ...invitation, action: 'invitation_declined' });
    });
  }

  private static checkAcceptable(invitation: DriverInvitationRecord, email: string): void {
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw DriverAppErrors.invitationExpired();
    }
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw DriverAppErrors.invitationForSomeoneElse(invitation.email);
    }
    if (invitation.isDriverDeleted || invitation.driverAccountId) {
      throw DriverAppErrors.invitationStale();
    }
  }
}
