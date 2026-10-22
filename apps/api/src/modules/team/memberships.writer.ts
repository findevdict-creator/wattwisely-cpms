import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { membershipRoles, roles, tenantMemberships, Transaction, UuidV7 } from '@wattwisely/db';
import { MemberRecord } from './member-record';
import { MembersRepository } from './members.repository';
import { RoleAssignment } from './role-assignment';
import { TeamErrors } from './team-errors';

/** A new or renewed invitation: who sent it, the hashed link secret and when it expires. */
export interface InvitationDetails {
  invitedBy: string;
  tokenHash: string;
  expiresAt: Date;
}

/** Changes tenant memberships and their roles. Every method runs inside the caller's transaction. */
@Injectable()
export class MembershipsWriter {
  static readonly OWNER_ROLE_KEY = 'owner';

  constructor(private readonly members: MembersRepository) {}

  /** The member, or 404; 409 when their status does not allow the change. */
  async requireMember(
    tx: Transaction,
    memberId: string,
    statuses: MemberRecord['status'][],
  ): Promise<MemberRecord> {
    const member = await this.members.findById(tx, memberId);
    if (!member) {
      throw TeamErrors.memberNotFound();
    }
    if (!statuses.includes(member.status)) {
      throw TeamErrors.wrongStatus(statuses.join(' or '));
    }
    return member;
  }

  /** Reads a member again after a change, for the response and the audit log. */
  async reload(tx: Transaction, memberId: string): Promise<MemberRecord> {
    return (await this.members.findById(tx, memberId)) as MemberRecord;
  }

  /** Checked after a change, inside the transaction: throwing undoes the change (story ACC-03). */
  async ensureOwnerRemains(tx: Transaction): Promise<void> {
    if ((await this.countOwners(tx)) === 0) {
      throw TeamErrors.lastOwner();
    }
  }

  async createInvitation(
    tx: Transaction,
    tenantId: string,
    userAccountId: string,
    invitation: InvitationDetails,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(tenantMemberships).values({
      id,
      tenantId,
      userAccountId,
      status: 'invited',
      ...MembershipsWriter.invitationColumns(invitation),
    });
    return id;
  }

  /** Invites again someone who was removed or whose invitation was cancelled. */
  async reopenInvitation(
    tx: Transaction,
    id: string,
    invitation: InvitationDetails,
  ): Promise<void> {
    await tx
      .update(tenantMemberships)
      .set({
        status: 'invited',
        joinedAt: null,
        removedAt: null,
        removedBy: null,
        ...MembershipsWriter.invitationColumns(invitation),
      })
      .where(eq(tenantMemberships.id, id));
  }

  /** A fresh link for a pending invitation. The old link stops working. */
  async renewInvitation(
    tx: Transaction,
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await tx
      .update(tenantMemberships)
      .set({ inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt })
      .where(eq(tenantMemberships.id, id));
  }

  async activate(tx: Transaction, id: string): Promise<void> {
    await tx
      .update(tenantMemberships)
      .set({ status: 'active', joinedAt: new Date(), inviteTokenHash: null })
      .where(eq(tenantMemberships.id, id));
  }

  /** Ends access (or cancels an invitation) and drops the roles. The row stays for the audit log. */
  async remove(tx: Transaction, id: string, removedBy: string): Promise<void> {
    await tx
      .update(tenantMemberships)
      .set({ status: 'removed', removedAt: new Date(), removedBy, inviteTokenHash: null })
      .where(eq(tenantMemberships.id, id));
    await tx.delete(membershipRoles).where(eq(membershipRoles.membershipId, id));
  }

  /** Replaces all of a member's roles in one go (PUT /members/{id}/roles). */
  async replaceRoles(
    tx: Transaction,
    membership: { tenantId: string; id: string },
    assignments: RoleAssignment[],
    createdBy: string,
  ): Promise<void> {
    await tx.delete(membershipRoles).where(eq(membershipRoles.membershipId, membership.id));
    await tx.insert(membershipRoles).values(
      assignments.map((assignment) => ({
        id: UuidV7.create(),
        tenantId: membership.tenantId,
        membershipId: membership.id,
        roleId: assignment.roleId,
        siteId: assignment.siteId,
        createdBy,
      })),
    );
  }

  /** Active members who hold Owner for the whole tenant. */
  private async countOwners(tx: Transaction): Promise<number> {
    const rows = await tx
      .selectDistinct({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .innerJoin(membershipRoles, eq(membershipRoles.membershipId, tenantMemberships.id))
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(
        and(
          eq(tenantMemberships.status, 'active'),
          eq(roles.key, MembershipsWriter.OWNER_ROLE_KEY),
          isNull(membershipRoles.siteId),
        ),
      );
    return rows.length;
  }

  private static invitationColumns(invitation: InvitationDetails) {
    return {
      invitedBy: invitation.invitedBy,
      invitedAt: new Date(),
      inviteTokenHash: invitation.tokenHash,
      inviteExpiresAt: invitation.expiresAt,
    };
  }
}
