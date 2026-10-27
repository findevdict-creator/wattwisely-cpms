import { eq } from 'drizzle-orm';
import { accessGroupMembers, accessGroups, drivers, rfidCards, Transaction } from '@wattwisely/db';
import { PaymentAccountRow } from '../store/payment-rows';
import {
  GroupPaymentSettings,
  PaymentLevels,
  PaymentRules,
  ResolvedPaymentRule,
} from './payment-rule';

/**
 * Reads the levels of the payment rule for a card or a driver (module 19) inside the
 * tenant's transaction, and resolves them. The gateway asks at a card tap, the API at a
 * start from the app and the worker when it places the hold.
 */
export class PaymentRuleResolver {
  /** The rule for a session this card starts; null when the card is unknown. */
  async forCard(
    tx: Transaction,
    cardId: string,
    account: PaymentAccountRow | null,
  ): Promise<ResolvedPaymentRule | null> {
    const rows = await tx
      .select({ driverId: rfidCards.driverId, paymentMode: rfidCards.paymentMode })
      .from(rfidCards)
      .where(eq(rfidCards.id, cardId));
    const card = rows[0];
    return card ? this.forDriver(tx, card.driverId, account, card.paymentMode) : null;
  }

  /** The rule for a session this driver starts from the app, or with the card whose mode is given. */
  async forDriver(
    tx: Transaction,
    driverId: string,
    account: PaymentAccountRow | null,
    cardMode: PaymentLevels['card'] = null,
  ): Promise<ResolvedPaymentRule | null> {
    const rows = await tx
      .select({ paymentMode: drivers.paymentMode, isGuest: drivers.isGuest })
      .from(drivers)
      .where(eq(drivers.id, driverId));
    const driver = rows[0];
    if (!driver) {
      return null;
    }
    const levels: PaymentLevels = {
      card: cardMode,
      driver: driver.paymentMode,
      groups: await this.groupsOf(tx, driverId),
      isGuest: driver.isGuest,
    };
    return PaymentRules.resolve(levels, PaymentRuleResolver.holdsOf(account));
  }

  /** A guest with no record at the operator (the anonymous QR page): always pay, the guest hold. */
  static forGuest(account: PaymentAccountRow | null): ResolvedPaymentRule {
    return { ...PaymentRules.GUEST, holdAmount: account?.holdAmount ?? null };
  }

  private async groupsOf(tx: Transaction, driverId: string): Promise<GroupPaymentSettings[]> {
    return tx
      .select({
        name: accessGroups.name,
        paymentMode: accessGroups.paymentMode,
        holdAmount: accessGroups.holdAmount,
      })
      .from(accessGroupMembers)
      .innerJoin(accessGroups, eq(accessGroups.id, accessGroupMembers.groupId))
      .where(eq(accessGroupMembers.driverId, driverId))
      .orderBy(accessGroups.name);
  }

  private static holdsOf(account: PaymentAccountRow | null) {
    return account
      ? { holdAmount: account.holdAmount, memberHoldAmount: account.memberHoldAmount }
      : null;
  }
}
