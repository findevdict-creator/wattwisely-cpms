import { Transaction } from '@wattwisely/db';
import { ChargeKey, ParsedChargeKey, PaymentRow, PaymentStore } from '@wattwisely/payments';
import { PaymentErrors } from '../payment-errors';

/**
 * Opens a charge key and finds the payment it proves. A key of the wrong shape, one that
 * names no payment, or one whose secret does not match the stored hash all answer 404:
 * the page learns nothing about whether the payment exists.
 */
export class ChargeKeyResolver {
  private readonly payments = new PaymentStore();

  parse(key: string): ParsedChargeKey {
    const parsed = ChargeKey.parse(key);
    if (!parsed) {
      throw PaymentErrors.notFound();
    }
    return parsed;
  }

  /** The payment the key proves; locked for the rest of the transaction when asked. */
  async resolve(
    tx: Transaction,
    parsed: ParsedChargeKey,
    isForUpdate = false,
  ): Promise<PaymentRow> {
    const payment = isForUpdate
      ? await this.payments.findForUpdate(tx, parsed.paymentId)
      : await this.payments.findById(tx, parsed.paymentId);
    if (!payment?.accessKeyHash || !ChargeKey.isValid(parsed, payment.accessKeyHash)) {
      throw PaymentErrors.notFound();
    }
    return payment;
  }
}
