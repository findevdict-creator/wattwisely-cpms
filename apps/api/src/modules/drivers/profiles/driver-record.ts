/** inherit asks the next level (card, driver, groups, tenant); pay holds a saved card; free skips payment. */
export type DriverPaymentMode = 'inherit' | 'pay' | 'free';

/** An invitation to the driver app that was sent and not yet accepted, declined or cancelled. */
export interface OpenInvitation {
  email: string;
  invitedAt: Date;
  expiresAt: Date;
}

/** One driver as the repository returns it, with the counts the list shows. */
export interface DriverRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reference: string;
  notes: string;
  status: 'active' | 'blocked';
  /** Whether the driver's sessions are paid (module 19): inherit, pay or free. */
  paymentMode: DriverPaymentMode;
  /** The driver's own login (module 19), once an invitation was accepted. */
  driverAccountId: string | null;
  accountEmail: string | null;
  linkedAt: Date | null;
  /** The invitation that is still open, if any. */
  invitation: OpenInvitation | null;
  blockedAt: Date | null;
  blockedByName: string | null;
  blockReason: string;
  /** Soft-deleted: hidden from lists, 404 by id; sessions still name the driver. */
  isDeleted: boolean;
  cardCount: number;
  activeCardCount: number;
  lastSessionAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A group a driver is in, by name. */
export interface DriverGroup {
  id: string;
  name: string;
}

/** A driver with the groups they are in. */
export interface DriverSummary extends DriverRecord {
  groups: DriverGroup[];
}
