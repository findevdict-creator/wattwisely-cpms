/** The tenant a request works in, read from the tenants table. */
export class TenantSummary {
  constructor(
    readonly id: string,
    readonly slug: string,
    readonly name: string,
    readonly status: 'trial' | 'active' | 'suspended' | 'cancelled',
  ) {}

  /** A suspended tenant can still log in and look, but cannot change anything (story ACC-01). */
  get isSuspended(): boolean {
    return this.status === 'suspended';
  }
}
