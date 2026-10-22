import { sql, SQL } from 'drizzle-orm';
import { AnyPgColumn, pgRole } from 'drizzle-orm/pg-core';

/**
 * The building blocks of every row-level security policy.
 *
 * The API runs each request in a transaction and first stores who is asking:
 *   app.tenant_id          the tenant picked for this request
 *   app.user_account_id    the logged-in person (to list their own memberships)
 *   app.invite_token_hash  only while someone opens an invitation link
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

  /** `tenant_id = <current tenant>`: the rule for every tenant-owned table. */
  static isCurrentTenant(column: AnyPgColumn): SQL {
    return sql`${column} = ${RowLevelSecurity.currentTenant()}`;
  }

  private static setting(name: string): SQL {
    return sql.raw(`nullif(current_setting('${name}', true), '')::uuid`);
  }
}
