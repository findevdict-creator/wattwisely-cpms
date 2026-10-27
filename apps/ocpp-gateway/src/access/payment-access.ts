import { Injectable } from '@nestjs/common';
import { SessionPaymentRule, Transaction } from '@wattwisely/db';
import {
  AccountStatusPolicy,
  PaymentAccountStore,
  PaymentRuleResolver,
  SavedCardLookup,
} from '@wattwisely/payments';
import { CardAccess } from './card-access';

/** Whether a session this card starts is paid, and whether it can be: the rule, and the way to pay. */
export interface PaymentVerdict {
  rule: SessionPaymentRule;
  /** False when the rule says pay and the card's holder has no usable saved card, or the operator takes no payments. */
  isPayable: boolean;
}

/**
 * The payment side of a card tap (module 19, decided 25 Oct): the rule resolves from the
 * card, the driver, their groups and the operator (which says pay). A paid session needs
 * the holder's login to have a default saved card and the operator an active payment
 * account; without them the charger must refuse the card rather than charge for nothing.
 */
@Injectable()
export class PaymentAccess {
  private readonly accounts = new PaymentAccountStore();
  private readonly rules = new PaymentRuleResolver();
  private readonly cards = new SavedCardLookup();

  /** Runs inside the charger's tenant, for a card the base verdict accepted. */
  async check(tx: Transaction, access: CardAccess): Promise<PaymentVerdict> {
    const account = await this.accounts.findCurrent(tx);
    const resolved = await this.rules.forCard(tx, access.cardId, account);
    const rule: SessionPaymentRule = resolved
      ? { outcome: resolved.outcome, decided_by: resolved.decided_by, label: resolved.label }
      : { outcome: 'pay', decided_by: 'operator', label: null };
    if (rule.outcome === 'free') {
      return { rule, isPayable: true };
    }
    const isAccepting = account !== null && AccountStatusPolicy.canTakePayments(account.status);
    const savedCard = isAccepting ? await this.cards.forDriver(tx, access.driverId) : null;
    return { rule, isPayable: savedCard !== null };
  }
}
