import { ApiProperty } from '@nestjs/swagger';
import { MemberRecord } from '../../team/member-record';
import { InvitationRecord } from '../invitation-record';

/** Body of GET /v1/invitations/{token}: what the invitation page shows before anyone logs in. */
export class InvitationPreviewDto {
  @ApiProperty({ example: 'Acme Charging' })
  readonly tenant_name: string;

  @ApiProperty({ description: 'The address the invitation was sent to; log in with it to accept' })
  readonly email: string;

  @ApiProperty({ type: [String], example: ['Technician'] })
  readonly roles: string[];

  @ApiProperty({ nullable: true })
  readonly invited_by: string | null;

  @ApiProperty()
  readonly expires_at: string;

  @ApiProperty()
  readonly is_expired: boolean;

  constructor(invitation: InvitationRecord, member: MemberRecord, now: Date = new Date()) {
    const expiresAt = invitation.expiresAt ?? now;
    this.tenant_name = invitation.tenantName;
    this.email = invitation.email;
    this.roles = [...new Set(member.grants.map((grant) => grant.roleName))];
    this.invited_by = member.invitedByName || null;
    this.expires_at = expiresAt.toISOString();
    this.is_expired = expiresAt.getTime() <= now.getTime();
  }
}
