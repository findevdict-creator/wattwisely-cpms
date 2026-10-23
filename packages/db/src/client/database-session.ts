/** The settings a transaction may carry; anything left out is empty, which hides the rows it guards. */
export interface DatabaseSessionOptions {
  tenantId?: string | null;
  userAccountId?: string | null;
  inviteTokenHash?: string | null;
  chargerIdentity?: string | null;
  providerAccountId?: string | null;
}

/**
 * What a transaction tells Postgres about the caller, for the row-level security policies.
 * Each value becomes a setting such as app.tenant_id that lasts until the transaction ends.
 */
export class DatabaseSession {
  readonly tenantId: string | null;
  readonly userAccountId: string | null;
  readonly inviteTokenHash: string | null;
  readonly chargerIdentity: string | null;
  readonly providerAccountId: string | null;

  constructor(options: DatabaseSessionOptions = {}) {
    this.tenantId = options.tenantId ?? null;
    this.userAccountId = options.userAccountId ?? null;
    this.inviteTokenHash = options.inviteTokenHash ?? null;
    this.chargerIdentity = options.chargerIdentity ?? null;
    this.providerAccountId = options.providerAccountId ?? null;
  }

  static forTenant(tenantId: string, userAccountId: string | null = null): DatabaseSession {
    return new DatabaseSession({ tenantId, userAccountId });
  }

  static forUser(userAccountId: string | null): DatabaseSession {
    return new DatabaseSession({ userAccountId });
  }

  static forInvitation(inviteTokenHash: string): DatabaseSession {
    return new DatabaseSession({ inviteTokenHash });
  }

  /** The OCPP gateway looking up a connecting charger by its identity, before its tenant is known. */
  static forChargerIdentity(identity: string): DatabaseSession {
    return new DatabaseSession({ chargerIdentity: identity });
  }

  /** A payment webhook looking up the tenant behind a connected account (acct_…), before its tenant is known. */
  static forProviderAccount(providerAccountId: string): DatabaseSession {
    return new DatabaseSession({ providerAccountId });
  }

  /** Global tables only (tenants, user_accounts): every tenant-owned row stays hidden. */
  static anonymous(): DatabaseSession {
    return new DatabaseSession();
  }
}
