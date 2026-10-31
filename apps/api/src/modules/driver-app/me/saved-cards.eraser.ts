import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { PAYMENT_GATEWAY, PaymentGateway, PaymentMethodStore } from '@wattwisely/payments';
import { PaymentErrors } from '../../payments/payment-errors';

/**
 * Forgets a deleted account's cards (module 33): the provider deletes the driver's customer,
 * and every card on it with it, then each card row is marked removed. A hold already taken
 * from a card is the operator's and is unaffected.
 */
@Injectable()
export class SavedCardsEraser {
  private readonly store = new PaymentMethodStore();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async erase(driverAccountId: string): Promise<void> {
    await this.runner.run(DatabaseSession.anonymous(), async (tx) => {
      const customerId = await this.store.customerOf(tx, driverAccountId);
      if (customerId) {
        await this.deleteCustomer(customerId);
      }
      for (const card of await this.store.findAll(tx, driverAccountId)) {
        await this.store.remove(tx, driverAccountId, card.id);
      }
    });
  }

  private async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.gateway.deleteCustomer(customerId);
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }
}
