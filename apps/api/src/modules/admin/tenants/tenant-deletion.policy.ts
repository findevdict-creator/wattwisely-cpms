import { TenantRecord } from './admin-tenant-record';

/**
 * When a tenant may be deleted (story ADM-02): 30 days after it was suspended, so a
 * tenant that stopped paying can come back with its data. Deletion marks the row and
 * frees nothing: the data stays for the retention period a later module enforces.
 */
export class TenantDeletionPolicy {
  static readonly WAIT_DAYS = 30;

  /** The first moment deletion is allowed, or null while the tenant is not suspended. */
  static allowedFrom(tenant: Pick<TenantRecord, 'status' | 'suspendedAt'>): Date | null {
    if (tenant.status !== 'suspended' || !tenant.suspendedAt) {
      return null;
    }
    const from = new Date(tenant.suspendedAt);
    from.setUTCDate(from.getUTCDate() + TenantDeletionPolicy.WAIT_DAYS);
    return from;
  }

  static canDelete(
    tenant: Pick<TenantRecord, 'status' | 'suspendedAt'>,
    now = new Date(),
  ): boolean {
    const from = TenantDeletionPolicy.allowedFrom(tenant);
    return from !== null && from <= now;
  }
}
