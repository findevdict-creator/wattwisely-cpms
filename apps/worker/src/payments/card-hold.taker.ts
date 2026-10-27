import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import {
  AccountStatusPolicy,
  PAYMENT_GATEWAY,
  PaymentAccountRow,
  PaymentAccountStore,
  PaymentGateway,
  PaymentRuleResolver,
  ResolvedPaymentRule,
  SavedCardHoldPlacer,
  SavedCardLookup,
  UsableSavedCard,
} from '@wattwisely/payments';
import { SessionRow } from '@wattwisely/session-engine';
import { HoldRefusalNotifier } from './hold-refusal.notifier';

/** Everything the hold needs, read inside the session's transaction. */
interface HoldNeeds {
  account: PaymentAccountRow | null;
  rule: ResolvedPaymentRule | null;
  card: UsableSavedCard | null;
}

/**
 * Takes the hold for one running card start (module 19): the operator's account, the rule
 * for the card and the holder's saved card are read now, since any of them may have changed
 * since the tap. Without a way to pay, or when the bank refuses, the charge is stopped and
 * the driver told.
 */
@Injectable()
export class CardHoldTaker {
  static readonly NO_CARD = 'The driver has no saved card to pay with.';
  static readonly NO_ACCOUNT = 'The operator cannot take card payments at the moment.';

  private readonly accounts = new PaymentAccountStore();
  private readonly rules = new PaymentRuleResolver();
  private readonly cards = new SavedCardLookup();
  private readonly placer: SavedCardHoldPlacer;

  constructor(
    private readonly notifier: HoldRefusalNotifier,
    @Inject(PAYMENT_GATEWAY) gateway: PaymentGateway,
  ) {
    this.placer = new SavedCardHoldPlacer(gateway);
  }

  /** True: the session now has a payment row, authorised or failed. */
  async take(tx: Transaction, session: SessionRow, now: Date): Promise<boolean> {
    const needs = await this.needsOf(tx, session);
    const holdAmount = needs.rule?.holdAmount ?? needs.account?.memberHoldAmount ?? 0;
    const payable = CardHoldTaker.payable(needs);
    if (typeof payable === 'string') {
      const refusal = { session, account: needs.account, holdAmount, message: payable };
      await this.placer.refuse(tx, refusal, now);
      await this.notifier.notify(tx, session, payable);
      return true;
    }
    const hold = { session, ...payable, holdAmount, description: 'EV charging' };
    const placed = await this.placer.place(tx, hold, now);
    if (placed.hold.status === 'failed') {
      await this.notifier.notify(tx, session, placed.hold.failure?.message ?? 'The bank said no.');
    }
    return true;
  }

  private async needsOf(tx: Transaction, session: SessionRow): Promise<HoldNeeds> {
    const account = await this.accounts.findCurrent(tx);
    const rule = session.rfidCardId
      ? await this.rules.forCard(tx, session.rfidCardId, account)
      : null;
    const card = session.driverId ? await this.cards.forDriver(tx, session.driverId) : null;
    return { account, rule, card };
  }

  /** The account and card to hold with, or the sentence that says why there is none. */
  private static payable(
    needs: HoldNeeds,
  ): { account: PaymentAccountRow; card: UsableSavedCard } | string {
    if (!needs.account || !AccountStatusPolicy.canTakePayments(needs.account.status)) {
      return CardHoldTaker.NO_ACCOUNT;
    }
    return needs.card ? { account: needs.account, card: needs.card } : CardHoldTaker.NO_CARD;
  }
}
