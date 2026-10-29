import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverLinkWriter } from '../driver-link.writer';
import { OperatorLinkTransaction } from '../operators/operator-link.transaction';
import { SavedCardsEraser } from './saved-cards.eraser';

/**
 * What deleting an account does outside the account's own row (module 33): the saved cards
 * go, and each operator's record of the driver is unlinked, or blanked when the app made it
 * as a guest record. Receipts stay with the sessions, which keep pointing at the records.
 */
@Injectable()
export class DriverAccountEraser {
  constructor(
    private readonly transaction: OperatorLinkTransaction,
    private readonly links: DriverLinkWriter,
    private readonly cards: SavedCardsEraser,
  ) {}

  async erase(auth: RequestAuth): Promise<void> {
    await this.cards.erase(auth.requireDriver().id);
    for (const link of await this.transaction.listAll(auth)) {
      await this.transaction.run(auth, link.tenantId, (tx) =>
        this.links.erase(tx, auth, { ...link, action: 'unlinked' }),
      );
    }
  }
}
