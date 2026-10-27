/** The settings a transaction may carry; anything left out is empty, which hides the rows it guards. */
export interface DatabaseSessionOptions {
  tenantId?: string | null;
  userAccountId?: string | null;
  inviteTokenHash?: string | null;
  chargerIdentity?: string | null;
  providerAccountId?: string | null;
  apiKeyHash?: string | null;
  messagingPhoneNumberId?: string | null;
  isPlatformAccess?: boolean;
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
  /** The hash of the API key a request carries, while the key is looked up (module 16). */
  readonly apiKeyHash: string | null;
  /** The chat number id an inbound message came to, while its channel is looked up (module 17). */
  readonly messagingPhoneNumberId: string | null;
  /** True only in admin console requests by Wattwisely staff (module 9). */
  readonly isPlatformAccess: boolean;

  constructor(options: DatabaseSessionOptions = {}) {
    this.tenantId = options.tenantId ?? null;
    this.userAccountId = options.userAccountId ?? null;
    this.inviteTokenHash = options.inviteTokenHash ?? null;
    this.chargerIdentity = options.chargerIdentity ?? null;
    this.providerAccountId = options.providerAccountId ?? null;
    this.apiKeyHash = options.apiKeyHash ?? null;
    this.messagingPhoneNumberId = options.messagingPhoneNumberId ?? null;
    this.isPlatformAccess = options.isPlatformAccess ?? false;
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

  /** A request with an API key looking up its key by the token's hash, before its tenant is known (module 16). */
  static forApiKey(apiKeyHash: string): DatabaseSession {
    return new DatabaseSession({ apiKeyHash });
  }

  /** A messaging webhook looking up the channel behind a phone number id, before its tenant is known (module 17). */
  static forMessagingPhoneNumber(phoneNumberId: string): DatabaseSession {
    return new DatabaseSession({ messagingPhoneNumberId: phoneNumberId });
  }

  /**
   * The admin console (module 9): platform staff read and write the global tables and every
   * tenant's plan rows, but no tenant's own data (sites, sessions, members stay hidden).
   */
  static forPlatform(userAccountId: string): DatabaseSession {
    return new DatabaseSession({ userAccountId, isPlatformAccess: true });
  }

  /** Platform staff working inside one tenant, e.g. inviting its first Owner and writing its audit log. */
  static forPlatformInTenant(tenantId: string, userAccountId: string): DatabaseSession {
    return new DatabaseSession({ tenantId, userAccountId, isPlatformAccess: true });
  }

  /**
   * The worker acting for the platform inside one tenant, with nobody logged in (module 10):
   * ending a managed service on its date removes the staff memberships the tenant cannot touch.
   */
  static forSystemInTenant(tenantId: string): DatabaseSession {
    return new DatabaseSession({ tenantId, isPlatformAccess: true });
  }

  /** The worker reading across tenants what only platform access may see, e.g. the agreements due to end. */
  static forSystem(): DatabaseSession {
    return new DatabaseSession({ isPlatformAccess: true });
  }

  /** Global tables only (tenants, user_accounts): every tenant-owned row stays hidden. */
  static anonymous(): DatabaseSession {
    return new DatabaseSession();
  }
}
