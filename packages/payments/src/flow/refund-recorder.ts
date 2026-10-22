import { Transaction } from '@wattwisely/db';
import { RefundState } from '../gateway/payment-gateway';
import { RefundRow } from '../store/payment-rows';
import { PaymentStore } from '../store/payment-store';
import { RefundStore } from '../store/refund-store';
import { RefundPolicy } from './refund-policy';

/**
 * Records what the provider says about a refund, from the call's answer or the webhook,
 * and moves the refunded total on the payment. Applying the same report twice changes nothing.
 */
export class RefundRecorder {
  constructor(
    private readonly refunds = new RefundStore(),
    private readonly payments = new PaymentStore(),
  ) {}

  /** True when the refund changed. */
  async apply(tx: Transaction, refund: RefundRow, state: RefundState, now: Date) {
    if (refund.status === 'succeeded' || refund.status === 'cancelled') {
      return false;
    }
    if (state.status === 'pending') {
      await this.refunds.update(tx, refund.id, {
        status: 'pending',
        providerRefundId: state.providerRefundId,
      });
      return refund.status !== 'pending';
    }
    if (state.status === 'failed') {
      await this.refunds.update(tx, refund.id, {
        status: 'failed',
        providerRefundId: state.providerRefundId,
        failureMessage: state.failureMessage ?? 'The provider could not refund this.',
        completedAt: now,
      });
      return true;
    }
    await this.refunds.update(tx, refund.id, {
      status: 'succeeded',
      providerRefundId: state.providerRefundId,
      completedAt: now,
    });
    await this.addToPayment(tx, refund.paymentId, refund.amount);
    return true;
  }

  private async addToPayment(tx: Transaction, paymentId: string, amount: number) {
    const payment = await this.payments.findForUpdate(tx, paymentId);
    if (!payment) {
      return;
    }
    const refundedAmount = payment.refundedAmount + amount;
    await this.payments.update(tx, payment.id, {
      refundedAmount,
      status: RefundPolicy.statusAfterRefund(payment, refundedAmount),
    });
  }
}
