import { ApiProperty } from '@nestjs/swagger';
import { DriverRecord } from '../driver-record';
import { DriverSnapshot } from '../driver-snapshot';

/**
 * The driver's own login as the operator sees it (module 19, story DRV-04): none, an open
 * invitation, or linked. Addresses are null without drivers:read_personal.
 */
export class DriverAccountLinkDto {
  @ApiProperty({ enum: ['none', 'invited', 'linked'] }) readonly status: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'The address the invitation went to, or the login’s address once linked',
  })
  readonly email: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly invited_at: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly invitation_expires_at: string | null;
  @ApiProperty({ description: 'True when the open invitation’s link no longer works' })
  readonly is_invitation_expired: boolean;
  @ApiProperty({ nullable: true, type: String }) readonly linked_at: string | null;

  constructor(driver: DriverRecord, now: Date = new Date()) {
    const invitation = driver.invitation;
    this.status = DriverSnapshot.accountStatusOf(driver);
    this.email = DriverAccountLinkDto.emailOf(driver);
    this.invited_at = invitation ? invitation.invitedAt.toISOString() : null;
    this.invitation_expires_at = invitation ? invitation.expiresAt.toISOString() : null;
    this.is_invitation_expired = invitation
      ? invitation.expiresAt.getTime() <= now.getTime()
      : false;
    this.linked_at = driver.linkedAt ? driver.linkedAt.toISOString() : null;
  }

  /** The login's address once linked, else the address the open invitation went to. */
  private static emailOf(driver: DriverRecord): string | null {
    if (driver.driverAccountId) {
      return driver.accountEmail;
    }
    return driver.invitation?.email || null;
  }
}
