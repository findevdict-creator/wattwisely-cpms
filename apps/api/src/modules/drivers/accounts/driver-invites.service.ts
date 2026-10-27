import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvitationToken } from '../../team/invitation-token';
import { DriverErrors } from '../driver-errors';
import { DriverRecord } from '../profiles/driver-record';
import { DriversRepository } from '../profiles/drivers.repository';
import { DriverInviteOutcome, DriverInviteTransaction } from './driver-invite.transaction';
import { DriverInvitationMailer } from './driver-invitation.mailer';
import { DriverInvitationRecord } from './driver-invitation-record';
import { DriverInvitationsRepository } from './driver-invitations.repository';
import { DriverInviteResultDto } from './dto/driver-invite-result.dto';
import { InviteDriverRequestDto } from './dto/invite-driver-request.dto';

/**
 * The operator's side of a driver's login (module 19, story DRV-04): invite a driver to the
 * app, resend or cancel the invitation, and unlink a login again. Each change is one
 * transaction with its audit entry; the e-mail goes out afterwards and can be resent if it fails.
 */
@Injectable()
export class DriverInvitesService {
  constructor(
    private readonly transaction: DriverInviteTransaction,
    private readonly drivers: DriversRepository,
    private readonly invitations: DriverInvitationsRepository,
    private readonly mailer: DriverInvitationMailer,
  ) {}

  async invite(
    auth: RequestAuth,
    driverId: string,
    request: InviteDriverRequestDto,
  ): Promise<DriverInviteResultDto> {
    const token = InvitationToken.create();
    const outcome = await this.transaction.run({
      auth,
      driverId,
      action: 'drivers.invited',
      work: (tx, driver) =>
        this.invitations.insert(tx, {
          id: UuidV7.create(),
          tenantId: auth.requireAccess().tenant.id,
          driverId: driver.id,
          email: DriverInvitesService.emailFor(driver, request),
          tokenHash: token.hash,
          invitedBy: auth.requireAccount().id,
          expiresAt: InvitationToken.expiresAt(),
        }),
    });
    return this.send(auth, outcome, token);
  }

  async resend(auth: RequestAuth, driverId: string): Promise<DriverInviteResultDto> {
    const token = InvitationToken.create();
    const outcome = await this.transaction.run({
      auth,
      driverId,
      action: 'drivers.invitation_resent',
      work: async (tx, driver) => {
        const open = await this.requireOpen(tx, driver.id);
        await this.invitations.renew(tx, open.id, token.hash, InvitationToken.expiresAt());
      },
    });
    return this.send(auth, outcome, token);
  }

  async cancel(auth: RequestAuth, driverId: string): Promise<void> {
    await this.transaction.run({
      auth,
      driverId,
      action: 'drivers.invitation_cancelled',
      work: async (tx, driver) => {
        const open = await this.requireOpen(tx, driver.id);
        await this.invitations.close(tx, open.id, 'cancelled');
      },
    });
  }

  /** The login stops seeing this operator; the driver record and its cards stay. */
  async unlink(auth: RequestAuth, driverId: string, version: number): Promise<void> {
    await this.transaction.run({
      auth,
      driverId,
      action: 'drivers.unlinked',
      work: async (tx, driver) => {
        if (!driver.driverAccountId) {
          throw DriverErrors.notLinked();
        }
        if (driver.version !== version) {
          throw VersionConflict.exception();
        }
        await this.drivers.setAccount(tx, driver.id, null);
      },
    });
  }

  /** The address to invite: the one given, else the driver's own; a driver already linked or invited is refused. */
  private static emailFor(driver: DriverRecord, request: InviteDriverRequestDto): string {
    if (driver.driverAccountId) {
      throw DriverErrors.alreadyLinked();
    }
    if (driver.invitation) {
      throw DriverErrors.alreadyInvited();
    }
    const email = request.email?.trim() || driver.email;
    if (!email) {
      throw DriverErrors.emailRequired();
    }
    return email;
  }

  private async requireOpen(tx: Transaction, driverId: string): Promise<DriverInvitationRecord> {
    const open = await this.invitations.findOpenByDriver(tx, driverId);
    if (!open) {
      throw DriverErrors.notInvited();
    }
    return open;
  }

  private async send(
    auth: RequestAuth,
    outcome: DriverInviteOutcome,
    token: InvitationToken,
  ): Promise<DriverInviteResultDto> {
    const inviter = auth.requireAccount();
    const invitation = outcome.driver.invitation as NonNullable<DriverRecord['invitation']>;
    const isSent = await this.mailer.send({
      to: invitation.email,
      tenantId: auth.requireAccess().tenant.id,
      driverName: outcome.driver.name,
      inviterName: inviter.name || inviter.email,
      token: token.value,
      expiresAt: invitation.expiresAt,
    });
    return new DriverInviteResultDto(outcome.detail, isSent);
  }
}
