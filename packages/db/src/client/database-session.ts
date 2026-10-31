/** The settings a transaction may carry; anything left out is empty, which hides the rows it guards. */
export interface DatabaseSessionOptions {
  tenantId?: string | null;
  userAccountId?: string | null;
  inviteTokenHash?: string | null;
  chargerIdentity?: string | null;
  providerAccountId?: string | null;
  apiKeyHash?: string | null;
  messagingPhoneNumberId?: string | null;
  driverAccountId?: string | null;
  isSiteSearch?: boolean;
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
  /** The driver account behind a driver app request (module 19): their own linked drivers rows are visible. */
  readonly driverAccountId: string | null;
  /** True while the app searches public sites near the driver, across tenants (module 35). */
  readonly isSiteSearch: boolean;
  /** True only in admin console requests by Wattwisely staff (module 9). */
  readonly isPlatformAccess: boolean;

  constructor(options: DatabaseSessionOptions = {}) {
    const given = DatabaseSession.given;
    this.tenantId = given(options.tenantId);
    this.userAccountId = given(options.userAccountId);
    this.inviteTokenHash = given(options.inviteTokenHash);
    this.chargerIdentity = given(options.chargerIdentity);
    this.providerAccountId = given(options.providerAccountId);
    this.apiKeyHash = given(options.apiKeyHash);
    this.messagingPhoneNumberId = given(options.messagingPhoneNumberId);
    this.driverAccountId = given(options.driverAccountId);
    this.isSiteSearch = options.isSiteSearch === true;
    this.isPlatformAccess = options.isPlatformAccess === true;
  }

  /** A setting that was left out is empty, which hides the rows it guards. */
  private static given(value: string | null | undefined): string | null {
    return value ?? null;
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
   * A driver in the driver app (module 19), before any tenant is chosen: the global driver
   * tables, and the drivers rows of every tenant that are linked to this account.
   */
  static forDriverAccount(driverAccountId: string): DatabaseSession {
    return new DatabaseSession({ driverAccountId });
  }

  /** The nearby search (module 35): the public sites of every tenant, nothing else. */
  static forSiteSearch(): DatabaseSession {
    return new DatabaseSession({ isSiteSearch: true });
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
