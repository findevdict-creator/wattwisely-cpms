import { sql } from 'drizzle-orm';
import { Database, DatabaseClient } from './database.client';
import { DatabaseSession } from './database-session';

/** A transaction handle. Repositories take one as their first argument. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Runs work in one database transaction that first tells Postgres who is asking
 * (Database Design, "How RLS works"). Services call this; repositories never open
 * their own transactions, so one service call is all-or-nothing.
 */
export class TransactionRunner {
  constructor(private readonly client: DatabaseClient) {}

  async run<T>(session: DatabaseSession, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.client.db.transaction(async (tx) => {
      await TransactionRunner.applySession(tx, session);
      return work(tx);
    });
  }

  /** Switches the tenant inside a running transaction, e.g. once an invitation shows which tenant it is for. */
  static async switchTenant(tx: Transaction, tenantId: string): Promise<void> {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
  }

  private static async applySession(tx: Transaction, session: DatabaseSession): Promise<void> {
    const settings = TransactionRunner.settings(session).map(
      ([name, value]) => sql`set_config(${name}, ${value ?? ''}, true)`,
    );
    await tx.execute(sql`select ${sql.join(settings, sql`, `)}`);
  }

  /** Each setting the policies read; an empty one hides the rows it guards. */
  private static settings(session: DatabaseSession): [string, string | null][] {
    return [
      ['app.tenant_id', session.tenantId],
      ['app.user_account_id', session.userAccountId],
      ['app.invite_token_hash', session.inviteTokenHash],
      ['app.charger_identity', session.chargerIdentity],
      ['app.provider_account_id', session.providerAccountId],
      ['app.api_key_hash', session.apiKeyHash],
      ['app.messaging_phone_number_id', session.messagingPhoneNumberId],
      ['app.driver_account_id', session.driverAccountId],
      ['app.site_search', TransactionRunner.flag(session.isSiteSearch)],
      ['app.platform_access', TransactionRunner.flag(session.isPlatformAccess)],
    ];
  }

  private static flag(isOn: boolean): string | null {
    return isOn ? 'true' : null;
  }
}
