import { sql, SQL } from 'drizzle-orm';
import { AnyPgColumn, pgRole } from 'drizzle-orm/pg-core';

/**
 * The building blocks of every row-level security policy.
 *
 * The API runs each request in a transaction and first stores who is asking:
 *   app.tenant_id          the tenant picked for this request
 *   app.user_account_id    the logged-in person (to list their own memberships)
 *   app.invite_token_hash  only while someone opens an invitation link
 *   app.charger_identity   only while the OCPP gateway looks up a charger that is connecting
 *   app.provider_account_id only while a payment webhook looks up whose connected account it is about
 *   app.api_key_hash       only while a request with an API key looks up which key and tenant it is (module 16)
 *   app.messaging_phone_number_id only while a messaging webhook looks up whose chat number a message came to (module 17)
 *   app.driver_account_id  the driver logged into the driver app, to see the drivers rows linked to them (module 19)
 *   app.platform_access    'true' only in admin console requests by Wattwisely staff (module 9)
 * A policy compares a row with these settings. When a setting is missing the
 * comparison is null, so the row is hidden: forgetting to set the tenant shows nothing.
 */
export class RowLevelSecurity {
  /** The database role the API and worker log in as. It does not own the tables and cannot bypass RLS. */
  static readonly APP_ROLE = pgRole('wattwisely_app').existing();

  static currentTenant(): SQL {
    return RowLevelSecurity.setting('app.tenant_id');
  }

  static currentUserAccount(): SQL {
    return RowLevelSecurity.setting('app.user_account_id');
  }

  static currentInviteTokenHash(): SQL {
    return sql`nullif(current_setting('app.invite_token_hash', true), '')`;
  }

  /** The charge point identity a connecting charger sent, before its tenant is known. */
  static currentChargerIdentity(): SQL {
    return sql`nullif(current_setting('app.charger_identity', true), '')`;
  }

  /** The payment provider's account id a webhook event names (acct_…), before its tenant is known. */
  static currentProviderAccountId(): SQL {
    return sql`nullif(current_setting('app.provider_account_id', true), '')`;
  }

  /** The SHA-256 of the API key a request carries, before its tenant is known (module 16). */
  static currentApiKeyHash(): SQL {
    return sql`nullif(current_setting('app.api_key_hash', true), '')`;
  }

  /** The messaging provider's phone number id an inbound chat message names, before its tenant is known (module 17). */
  static currentMessagingPhoneNumberId(): SQL {
    return sql`nullif(current_setting('app.messaging_phone_number_id', true), '')`;
  }

  /** The driver account behind a driver app request (module 19), before any tenant is chosen. */
  static currentDriverAccount(): SQL {
    return RowLevelSecurity.setting('app.driver_account_id');
  }

  /** `tenant_id = <current tenant>`: the rule for every tenant-owned table. */
  static isCurrentTenant(column: AnyPgColumn): SQL {
    return sql`${column} = ${RowLevelSecurity.currentTenant()}`;
  }

  /** True inside an admin console request: platform staff see and change every tenant's plan rows. */
  static isPlatformAccess(): SQL {
    return sql`current_setting('app.platform_access', true) = 'true'`;
  }

  /** True while the mobile app looks for public sites near the driver, across tenants (module 35). */
  static isSiteSearch(): SQL {
    return sql`current_setting('app.site_search', true) = 'true'`;
  }

  /** A row linked to the driver account behind a driver app request, e.g. their own drivers rows. */
  static isCurrentDriverAccount(column: AnyPgColumn): SQL {
    return sql`${column} = ${RowLevelSecurity.currentDriverAccount()}`;
  }

  /** The row of the logged-in person themselves, e.g. their own platform_staff row. */
  static isCurrentUserAccount(column: AnyPgColumn): SQL {
    return sql`${column} = ${RowLevelSecurity.currentUserAccount()}`;
  }

  private static setting(name: string): SQL {
    return sql.raw(`nullif(current_setting('${name}', true), '')::uuid`);
  }
}
