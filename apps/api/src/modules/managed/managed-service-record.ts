import { managedServices } from '@wattwisely/db';

/** One managed_services row. */
export type ManagedServiceRow = typeof managedServices.$inferSelect;

/** A managed service agreement with the staff member who looks after the tenant. */
export interface ManagedServiceRecord extends ManagedServiceRow {
  accountManager: { staffId: string; name: string; email: string } | null;
}

/** A Wattwisely staff member assigned to a tenant as its Managed operator. */
export interface ManagedOperatorRecord {
  id: string;
  tenantId: string;
  managedServiceId: string;
  userAccountId: string;
  membershipId: string;
  staffId: string | null;
  email: string;
  name: string;
  assignedAt: Date;
  removedAt: Date | null;
}

/** The statuses in which an agreement is in force or about to be. */
export class ManagedServiceStatuses {
  static readonly LIVE: readonly ManagedServiceRow['status'][] = [
    'pending_acceptance',
    'active',
    'ending',
  ];

  static readonly IN_FORCE: readonly ManagedServiceRow['status'][] = ['active', 'ending'];

  static isLive(status: ManagedServiceRow['status']): boolean {
    return ManagedServiceStatuses.LIVE.includes(status);
  }

  static isInForce(status: ManagedServiceRow['status']): boolean {
    return ManagedServiceStatuses.IN_FORCE.includes(status);
  }
}
