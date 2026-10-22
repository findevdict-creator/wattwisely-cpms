/**
 * What a transaction tells Postgres about the caller, for the row-level security policies.
 * Each value becomes a setting such as app.tenant_id that lasts until the transaction ends.
 */
export class DatabaseSession {
  constructor(
    readonly tenantId: string | null = null,
    readonly userAccountId: string | null = null,
    readonly inviteTokenHash: string | null = null,
  ) {}

  static forTenant(tenantId: string, userAccountId: string | null = null): DatabaseSession {
    return new DatabaseSession(tenantId, userAccountId);
  }

  static forUser(userAccountId: string | null): DatabaseSession {
    return new DatabaseSession(null, userAccountId);
  }

  static forInvitation(inviteTokenHash: string): DatabaseSession {
    return new DatabaseSession(null, null, inviteTokenHash);
  }

  /** Global tables only (tenants, user_accounts): every tenant-owned row stays hidden. */
  static anonymous(): DatabaseSession {
    return new DatabaseSession();
  }
}
