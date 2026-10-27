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
    await tx.execute(sql`select
      set_config('app.tenant_id', ${session.tenantId ?? ''}, true),
      set_config('app.user_account_id', ${session.userAccountId ?? ''}, true),
      set_config('app.invite_token_hash', ${session.inviteTokenHash ?? ''}, true),
      set_config('app.charger_identity', ${session.chargerIdentity ?? ''}, true),
      set_config('app.provider_account_id', ${session.providerAccountId ?? ''}, true),
      set_config('app.platform_access', ${session.isPlatformAccess ? 'true' : ''}, true)`);
  }
}
