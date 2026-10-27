import { Injectable } from '@nestjs/common';
import { SessionPaymentRule, SessionStartSource, Transaction } from '@wattwisely/db';
import { PaymentRules } from '@wattwisely/payments';
import { CardAccess } from '../access/card-access';
import { CardAccessRepository } from '../access/card-access.repository';
import { PaymentAccess } from '../access/payment-access';
import { TagVerdict } from '../access/tag-verdict';
import { GatewayConfig } from '../config/gateway.config';
import { IdTagStatus } from '../adapters/v16/v16-messages';
import { IssuedTagRegistry } from './issued-tag.registry';

/** The verdict on an idTag, and what a session it starts records about who it is for and who pays. */
export interface TagDecision {
  status: IdTagStatus;
  cardId: string | null;
  driverId: string | null;
  /** How the session is started (module 19); null for an unknown tag let through on a bench. */
  startSource: SessionStartSource | null;
  /** Who pays (module 19); null when nothing is known about the tag. */
  paymentRule: SessionPaymentRule | null;
  /** Why an otherwise valid card was refused: it must pay and its holder has no way to. */
  refusal: 'no_payment_method' | null;
}

/**
 * Who may start a charge: a tag the platform issued for a remote start (module 6), a
 * driver's RFID card as the tenant registered it (module 13: active card, active driver,
 * not expired, and at a private site a member of a group that names the site), or anyone
 * when OCPP_ACCEPT_UNKNOWN_ID_TAGS is on (bench testing). A registered card keeps its
 * verdict even then, so a blocked card stays blocked on the bench. Since module 19 a card
 * whose session must be paid also needs a way to pay: its holder's saved card.
 */
@Injectable()
export class TagPolicy {
  static readonly ISSUED: TagDecision = {
    status: 'Accepted',
    cardId: null,
    driverId: null,
    startSource: 'staff',
    paymentRule: PaymentRules.STAFF,
    refusal: null,
  };
  static readonly UNKNOWN: Omit<TagDecision, 'status'> = {
    cardId: null,
    driverId: null,
    startSource: null,
    paymentRule: null,
    refusal: null,
  };

  constructor(
    private readonly issued: IssuedTagRegistry,
    private readonly cards: CardAccessRepository,
    private readonly payments: PaymentAccess,
    private readonly config: GatewayConfig,
  ) {}

  /** Runs inside the charger's tenant; an accepted card is marked as used now. */
  async decide(tx: Transaction, chargerId: string, idTag: string): Promise<TagDecision> {
    if (this.issued.isIssued(chargerId, idTag)) {
      return TagPolicy.ISSUED;
    }
    const access = await this.cards.findByTag(tx, chargerId, idTag);
    if (!access) {
      const status = this.config.isAnyIdTagAccepted ? 'Accepted' : 'Invalid';
      return { status, ...TagPolicy.UNKNOWN };
    }
    const status = TagVerdict.of(access);
    return status === 'Accepted'
      ? this.accepted(tx, access)
      : { ...TagPolicy.card(access), status, paymentRule: null };
  }

  /** A card the access rules let through still has to be able to pay (module 19). */
  private async accepted(tx: Transaction, access: CardAccess): Promise<TagDecision> {
    const payment = await this.payments.check(tx, access);
    if (!payment.isPayable) {
      return {
        ...TagPolicy.card(access),
        status: 'Invalid',
        paymentRule: payment.rule,
        refusal: 'no_payment_method',
      };
    }
    await this.cards.markUsed(tx, access.cardId);
    return { ...TagPolicy.card(access), status: 'Accepted', paymentRule: payment.rule };
  }

  private static card(access: CardAccess): Omit<TagDecision, 'status' | 'paymentRule'> {
    return {
      cardId: access.cardId,
      driverId: access.driverId,
      startSource: 'rfid_card',
      refusal: null,
    };
  }

  /** At StartTransaction: the verdict, and the remote start command behind the tag if there is one. */
  async start(
    tx: Transaction,
    chargerId: string,
    idTag: string,
  ): Promise<TagDecision & { commandId: string | null }> {
    const decision = await this.decide(tx, chargerId, idTag);
    return { ...decision, commandId: this.issued.take(chargerId, idTag) };
  }
}
