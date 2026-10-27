import { ApiProperty } from '@nestjs/swagger';
import { DriverInvitationRecord } from '../../../drivers/accounts/driver-invitation-record';

/** GET /v1/driver/invitations/{token}: what the invitation page shows before anyone logs in (module 19). */
export class DriverInvitationPreviewDto {
  @ApiProperty({ example: 'Acme Charging' }) readonly operator_name: string;
  @ApiProperty({ description: 'The name the operator keeps for the driver' })
  readonly driver_name: string;
  @ApiProperty({ description: 'The address the invitation was sent to; log in with it to accept' })
  readonly email: string;
  @ApiProperty({ nullable: true, type: String }) readonly invited_by: string | null;
  @ApiProperty() readonly expires_at: string;
  @ApiProperty() readonly is_expired: boolean;

  constructor(invitation: DriverInvitationRecord, now: Date = new Date()) {
    this.operator_name = invitation.tenantName;
    this.driver_name = invitation.driverName;
    this.email = invitation.email;
    this.invited_by = invitation.invitedByName;
    this.expires_at = invitation.expiresAt.toISOString();
    this.is_expired = invitation.expiresAt.getTime() <= now.getTime();
  }
}
