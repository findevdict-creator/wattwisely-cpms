/**
 * A driver invitation as the repository returns it (module 19), with the driver and the
 * operator it is for. Open while token_hash is set; accepted, declined or cancelled afterwards.
 */
export interface DriverInvitationRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  driverId: string;
  driverName: string;
  /** True when the operator deleted the driver meanwhile: the link then leads nowhere. */
  isDriverDeleted: boolean;
  /** The login already linked to the driver, if any; the invitation is then stale. */
  driverAccountId: string | null;
  email: string;
  invitedByName: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}
