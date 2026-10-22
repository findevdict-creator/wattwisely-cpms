import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../common/request/request-auth';
import { MemberDto } from './dto/member.dto';
import { ReplaceMemberRolesRequestDto } from './dto/replace-member-roles-request.dto';
import { MemberChangeRecorder } from './member-change.recorder';
import { MembershipsWriter } from './memberships.writer';
import { RoleAssignment } from './role-assignment';
import { RoleAssignmentPolicy } from './role-assignment.policy';
import { TeamTransaction } from './team.transaction';

/** Changing a member's roles, removing members and cancelling invitations (story ACC-03). */
@Injectable()
export class MemberAccessService {
  constructor(
    private readonly teamTransaction: TeamTransaction,
    private readonly writer: MembershipsWriter,
    private readonly policy: RoleAssignmentPolicy,
    private readonly changes: MemberChangeRecorder,
  ) {}

  async replaceRoles(
    auth: RequestAuth,
    memberId: string,
    request: ReplaceMemberRolesRequestDto,
  ): Promise<MemberDto> {
    const member = await this.teamTransaction.run(auth, async (tx) => {
      const before = await this.writer.requireMember(tx, memberId, ['active', 'invited']);
      const assignments = RoleAssignment.fromRequest(request.roles);
      await this.policy.check(tx, assignments, auth.requireAccess().permissions);
      const membership = { tenantId: auth.requireAccess().tenant.id, id: before.id };
      await this.writer.replaceRoles(tx, membership, assignments, auth.requireAccount().id);
      await this.writer.ensureOwnerRemains(tx);
      const after = await this.writer.reload(tx, memberId);
      await this.changes.record(tx, auth, 'member_roles_changed', { before, after });
      return after;
    });
    return new MemberDto(member);
  }

  /** Ends an active member's access. Their open sessions stop working within 60 seconds. */
  async remove(auth: RequestAuth, memberId: string): Promise<void> {
    await this.teamTransaction.run(auth, async (tx) => {
      const before = await this.writer.requireMember(tx, memberId, ['active']);
      await this.writer.remove(tx, before.id, auth.requireAccount().id);
      await this.writer.ensureOwnerRemains(tx);
      await this.changes.record(tx, auth, 'member_removed', { before, after: null });
      return before;
    });
  }

  async cancelInvitation(auth: RequestAuth, memberId: string): Promise<void> {
    await this.teamTransaction.run(auth, async (tx) => {
      const before = await this.writer.requireMember(tx, memberId, ['invited']);
      await this.writer.remove(tx, before.id, auth.requireAccount().id);
      await this.changes.record(tx, auth, 'invitation_cancelled', { before, after: null });
      return before;
    });
  }
}
