import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { roles, Transaction } from '@wattwisely/db';
import { UserAccountsRepository } from '../../../common/account/user-accounts.repository';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvitationMailer } from '../../team/invitation.mailer';
import { InvitationToken } from '../../team/invitation-token';
import { MemberRecord } from '../../team/member-record';
import { MembersRepository } from '../../team/members.repository';
import { MembershipsWriter } from '../../team/memberships.writer';
import { RoleAssignment } from '../../team/role-assignment';
import { AdminTenantErrors } from './admin-tenant-errors';

/** A saved Owner invitation and the secret for its link. */
export interface OwnerInvitation {
  member: MemberRecord;
  token: InvitationToken;
}

/**
 * Invites a tenant's first (or next) Owner from the admin console (story ADM-01). The
 * same invitation as the portal sends (module 2), saved inside the tenant with platform
 * access and signed "Wattwisely" instead of a colleague's name.
 */
@Injectable()
export class OwnerInviter {
  static readonly INVITER_NAME = 'Wattwisely';

  constructor(
    private readonly accounts: UserAccountsRepository,
    private readonly members: MembersRepository,
    private readonly writer: MembershipsWriter,
    private readonly mailer: InvitationMailer,
  ) {}

  /** Inside the tenant's transaction: the invitation row and its Owner role. */
  async save(
    tx: Transaction,
    auth: RequestAuth,
    tenantId: string,
    email: string,
  ): Promise<OwnerInvitation> {
    const token = InvitationToken.create();
    const account = await this.accounts.findOrCreateByEmail(tx, email.trim());
    const existing = await this.members.findByAccount(tx, account.id);
    if (existing && existing.status !== 'removed') {
      throw AdminTenantErrors.alreadyOwner();
    }
    const details = {
      invitedBy: auth.requireAccount().id,
      tokenHash: token.hash,
      expiresAt: InvitationToken.expiresAt(),
    };
    let id = existing?.id;
    if (id) {
      await this.writer.reopenInvitation(tx, id, details);
    } else {
      id = await this.writer.createInvitation(tx, tenantId, account.id, details);
    }
    const assignment = new RoleAssignment(await OwnerInviter.ownerRoleId(tx), null);
    await this.writer.replaceRoles(tx, { tenantId, id }, [assignment], details.invitedBy);
    return { member: await this.writer.reload(tx, id), token };
  }

  /** After the transaction: the e-mail. False when the mail server refused. */
  sendEmail(tenantId: string, invitation: OwnerInvitation): Promise<boolean> {
    return this.mailer.send({
      to: invitation.member.email,
      tenantId,
      inviterName: OwnerInviter.INVITER_NAME,
      roleNames: ['Owner'],
      token: invitation.token.value,
      expiresAt: invitation.member.inviteExpiresAt as Date,
    });
  }

  private static async ownerRoleId(tx: Transaction): Promise<string> {
    const [row] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, MembershipsWriter.OWNER_ROLE_KEY));
    return row.id;
  }
}
