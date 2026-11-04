import { ApiProperty } from '@nestjs/swagger';
import { MemberGrant } from '../../team/member-record';
import { InvitationRecord } from '../invitation-record';

/** One invitation waiting for the logged-in person, in GET /v1/me. */
export class PendingInvitationDto {
  @ApiProperty({ description: 'Accept it with POST /v1/me/invitations/{id}/accept' })
  readonly id: string;

  @ApiProperty()
  readonly tenant_id: string;

  @ApiProperty({ example: 'Acme Charging' })
  readonly tenant_name: string;

  @ApiProperty({ type: [String], example: ['Owner'] })
  readonly roles: string[];

  @ApiProperty({ nullable: true })
  readonly invited_by: string | null;

  @ApiProperty()
  readonly expires_at: string;

  constructor(invitation: InvitationRecord, grants: MemberGrant[], invitedBy?: string | null) {
    this.id = invitation.membershipId;
    this.tenant_id = invitation.tenantId;
    this.tenant_name = invitation.tenantName;
    this.roles = [...new Set(grants.map((grant) => grant.roleName))];
    this.invited_by = invitedBy || null;
    this.expires_at = (invitation.expiresAt ?? new Date()).toISOString();
  }
}
