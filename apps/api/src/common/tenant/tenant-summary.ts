/** The columns of a tenants row that TenantSummary carries. */
export interface TenantSummaryFields {
  id: string;
  slug: string;
  name: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  serviceTier: 'self_serve' | 'managed';
}

/** The tenant a request works in, read from the tenants table. */
export class TenantSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: TenantSummaryFields['status'];
  /**
   * Managed while a managed service agreement is in force (module 10). Derived from the
   * agreements the current session may see, so it is only meaningful inside the tenant.
   */
  readonly serviceTier: TenantSummaryFields['serviceTier'];

  constructor(fields: TenantSummaryFields) {
    this.id = fields.id;
    this.slug = fields.slug;
    this.name = fields.name;
    this.status = fields.status;
    this.serviceTier = fields.serviceTier;
  }

  /** A suspended tenant can still log in and look, but cannot change anything (story ACC-01). */
  get isSuspended(): boolean {
    return this.status === 'suspended';
  }

  get isManaged(): boolean {
    return this.serviceTier === 'managed';
  }
}
