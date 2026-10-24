import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { CardAccessRepository } from '../access/card-access.repository';
import { TagVerdict } from '../access/tag-verdict';
import { GatewayConfig } from '../config/gateway.config';
import { IdTagStatus } from '../adapters/v16/v16-messages';
import { IssuedTagRegistry } from './issued-tag.registry';

/** The verdict on an idTag, and the card and driver behind it when it was a registered card. */
export interface TagDecision {
  status: IdTagStatus;
  cardId: string | null;
  driverId: string | null;
}

/**
 * Who may start a charge: a tag the platform issued for a remote start (module 6), a
 * driver's RFID card as the tenant registered it (module 13: active card, active driver,
 * not expired, and at a private site a member of a group that names the site), or anyone
 * when OCPP_ACCEPT_UNKNOWN_ID_TAGS is on (bench testing). A registered card keeps its
 * verdict even then, so a blocked card stays blocked on the bench. App tokens come with
 * driver accounts, later.
 */
@Injectable()
export class TagPolicy {
  constructor(
    private readonly issued: IssuedTagRegistry,
    private readonly cards: CardAccessRepository,
    private readonly config: GatewayConfig,
  ) {}

  /** Runs inside the charger's tenant; an accepted card is marked as used now. */
  async decide(tx: Transaction, chargerId: string, idTag: string): Promise<TagDecision> {
    if (this.issued.isIssued(chargerId, idTag)) {
      return { status: 'Accepted', cardId: null, driverId: null };
    }
    const access = await this.cards.findByTag(tx, chargerId, idTag);
    if (!access) {
      const status = this.config.isAnyIdTagAccepted ? 'Accepted' : 'Invalid';
      return { status, cardId: null, driverId: null };
    }
    const status = TagVerdict.of(access);
    if (status === 'Accepted') {
      await this.cards.markUsed(tx, access.cardId);
    }
    return { status, cardId: access.cardId, driverId: access.driverId };
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
