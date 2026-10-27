import { and, desc, eq, sql } from 'drizzle-orm';
import { driverAccounts, paymentMethods, Transaction } from '@wattwisely/db';
import { SavedCard } from '../gateway/saved-cards';
import { NewPaymentMethod, PaymentMethodRow } from './payment-rows';

/** What a saved card is inserted from: the row's own columns, and the card as the provider described it. */
export type NewSavedCard = Pick<NewPaymentMethod, 'id' | 'driverAccountId' | 'provider'> & {
  card: SavedCard;
};

/**
 * The cards drivers saved to their accounts (module 19), and the customer each account has
 * at the provider. Global rows: the caller passes the account they are about, and nothing else.
 */
export class PaymentMethodStore {
  /** The account's usable cards, the default first, then the newest. */
  async findAll(tx: Transaction, driverAccountId: string): Promise<PaymentMethodRow[]> {
    return tx
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.driverAccountId, driverAccountId),
          eq(paymentMethods.status, 'active'),
        ),
      )
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
  }

  async findById(tx: Transaction, driverAccountId: string, id: string) {
    const rows = await tx
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.driverAccountId, driverAccountId)));
    return rows[0] ?? null;
  }

  /** A card by the provider's id, saved or removed: a setup read back twice saves one card. */
  async findByProviderMethod(tx: Transaction, providerPaymentMethodId: string) {
    const rows = await tx
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.providerPaymentMethodId, providerPaymentMethodId));
    return rows[0] ?? null;
  }

  /** The card a hold is taken from, if the account has one that is still usable. */
  async findDefault(tx: Transaction, driverAccountId: string): Promise<PaymentMethodRow | null> {
    const rows = await tx
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.driverAccountId, driverAccountId),
          eq(paymentMethods.status, 'active'),
          eq(paymentMethods.isDefault, true),
        ),
      );
    return rows[0] ?? null;
  }

  /** Saves a card; it becomes the default when the account had none. */
  async insert(tx: Transaction, row: NewSavedCard) {
    const hasDefault = (await this.findDefault(tx, row.driverAccountId)) !== null;
    const { card, ...columns } = row;
    const rows = await tx
      .insert(paymentMethods)
      .values({
        ...columns,
        providerPaymentMethodId: card.providerPaymentMethodId,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        isDefault: !hasDefault,
      })
      .returning();
    return rows[0];
  }

  /** Makes this card the default, and the previous one not. */
  async setDefault(tx: Transaction, driverAccountId: string, id: string): Promise<void> {
    await tx
      .update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(paymentMethods.driverAccountId, driverAccountId),
          eq(paymentMethods.isDefault, true),
        ),
      );
    await tx
      .update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id));
  }

  /** The card is gone; when it was the default, the newest card left takes over. */
  async remove(tx: Transaction, driverAccountId: string, id: string): Promise<void> {
    await tx
      .update(paymentMethods)
      .set({ status: 'removed', isDefault: false, removedAt: new Date(), updatedAt: new Date() })
      .where(eq(paymentMethods.id, id));
    const left = await this.findAll(tx, driverAccountId);
    if (left.length > 0 && !left[0].isDefault) {
      await this.setDefault(tx, driverAccountId, left[0].id);
    }
  }

  /** The account's customer at the provider, once a card was saved. */
  async customerOf(tx: Transaction, driverAccountId: string): Promise<string | null> {
    const rows = await tx
      .select({ customerId: driverAccounts.paymentCustomerId })
      .from(driverAccounts)
      .where(eq(driverAccounts.id, driverAccountId));
    return rows[0]?.customerId ?? null;
  }

  async saveCustomer(tx: Transaction, driverAccountId: string, customerId: string): Promise<void> {
    await tx
      .update(driverAccounts)
      .set({ paymentCustomerId: customerId, updatedAt: sql`now()` })
      .where(eq(driverAccounts.id, driverAccountId));
  }
}
