import { ApiProperty } from '@nestjs/swagger';
import { MemberGrants, MemberRecord } from '../member-record';
import { MemberRoleDto } from './member-role.dto';

/** A team member or a pending invitation. */
export class MemberDto {
  @ApiProperty({
    description: 'The membership id, used in /members/{id} and /members/invites/{id}',
  })
  readonly id: string;

  @ApiProperty()
  readonly user_account_id: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty({ description: 'Empty until the person first logs in' })
  readonly name: string;

  @ApiProperty({ enum: ['invited', 'active', 'removed'] })
  readonly status: string;

  @ApiProperty({ type: [MemberRoleDto] })
  readonly roles: MemberRoleDto[];

  @ApiProperty({ nullable: true, description: 'Who sent the invitation' })
  readonly invited_by: string | null;

  @ApiProperty({ nullable: true })
  readonly invited_at: string | null;

  @ApiProperty({ nullable: true })
  readonly invite_expires_at: string | null;

  @ApiProperty({ description: 'True for an invitation whose link has expired; resend it' })
  readonly is_invite_expired: boolean;

  @ApiProperty({ nullable: true })
  readonly joined_at: string | null;

  @ApiProperty({ nullable: true })
  readonly removed_at: string | null;

  @ApiProperty({
    description: 'Wattwisely staff under the managed service agreement: shown, never edited here',
  })
  readonly is_managed_operator: boolean;

  constructor(member: MemberRecord, now: Date = new Date()) {
    this.id = member.id;
    this.user_account_id = member.userAccountId;
    this.email = member.email;
    this.name = member.name;
    this.status = member.status;
    this.roles = MemberRoleDto.fromGrants(member.grants);
    this.invited_by = member.invitedByName || null;
    this.invited_at = MemberDto.iso(member.invitedAt);
    this.invite_expires_at = MemberDto.iso(member.inviteExpiresAt);
    this.is_invite_expired =
      member.status === 'invited' && (member.inviteExpiresAt?.getTime() ?? 0) <= now.getTime();
    this.joined_at = MemberDto.iso(member.joinedAt);
    this.removed_at = MemberDto.iso(member.removedAt);
    this.is_managed_operator = MemberGrants.isManagedOperator(member.grants);
  }

  private static iso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }
}
