import { and, eq } from 'drizzle-orm';
import { paymentAccounts, Transaction } from '@wattwisely/db';
import { AccountState } from '../gateway/payment-gateway';
import { AccountStatusPolicy } from './account-status-policy';
import { NewPaymentAccount, PaymentAccountRow } from './payment-rows';

/** The two holds a tenant takes (module 19): on a guest's card, and on one of its own drivers' saved card. */
export interface HoldAmounts {
  holdAmount?: number;
  memberHoldAmount?: number;
}

/** Reads and writes the tenant's connected account. RLS limits every query to the current tenant. */
export class PaymentAccountStore {
  /** The current tenant's account, if it connected one. */
  async findCurrent(tx: Transaction): Promise<PaymentAccountRow | null> {
    const rows = await tx.select().from(paymentAccounts).limit(1);
    return rows[0] ?? null;
  }

  /** Under DatabaseSession.forProviderAccount: the one row the lookup policy shows. */
  async findByProviderAccountId(tx: Transaction, providerAccountId: string) {
    const rows = await tx
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.providerAccountId, providerAccountId));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: NewPaymentAccount): Promise<PaymentAccountRow> {
    const rows = await tx.insert(paymentAccounts).values(row).returning();
    return rows[0];
  }

  /** Copies what the provider reports onto the row and works out the status. */
  async sync(tx: Transaction, account: PaymentAccountRow, state: AccountState, now: Date) {
    const rows = await tx
      .update(paymentAccounts)
      .set({
        status: AccountStatusPolicy.statusOf(state, account.status),
        isChargesEnabled: state.isChargesEnabled,
        isPayoutsEnabled: state.isPayoutsEnabled,
        isDetailsSubmitted: state.isDetailsSubmitted,
        requirements: state.requirements,
        defaultCurrency: state.defaultCurrency ?? account.defaultCurrency,
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(paymentAccounts.id, account.id))
      .returning();
    return rows[0] ?? account;
  }

  /** Applies the new holds only when the row still has the version the client saw. True when it did. */
  async updateHold(tx: Transaction, id: string, version: number, holds: HoldAmounts) {
    const rows = await tx
      .update(paymentAccounts)
      .set({ ...holds, version: version + 1, updatedAt: new Date() })
      .where(and(eq(paymentAccounts.id, id), eq(paymentAccounts.version, version)))
      .returning({ id: paymentAccounts.id });
    return rows.length === 1;
  }
}
