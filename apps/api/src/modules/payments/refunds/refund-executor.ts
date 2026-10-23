import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  PaymentGatewayError,
  PaymentRow,
  RefundRecorder,
  RefundRow,
  RefundStore,
} from '@wattwisely/payments';

/**
 * Sends a refund to the provider and records the answer, in the caller's transaction. A
 * refund the provider refused is kept as failed with the reason; one the provider is
 * still working on finishes when its webhook arrives. The idempotency key is the refund's
 * own id, so a retry can never refund twice.
 */
@Injectable()
export class RefundExecutor {
  private readonly refunds = new RefundStore();
  private readonly recorder = new RefundRecorder();

  constructor(@Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway) {}

  async execute(tx: Transaction, payment: PaymentRow, refund: RefundRow): Promise<RefundRow> {
    const now = new Date();
    try {
      const state = await this.gateway.refund({
        accountId: payment.providerAccountId,
        providerPaymentId: payment.providerPaymentId,
        amount: refund.amount,
        reason: refund.reason,
        metadata: { refundId: refund.id, paymentId: payment.id, sessionId: payment.sessionId },
        idempotencyKey: `refund:${refund.id}`,
      });
      await this.recorder.apply(tx, refund, state, now);
    } catch (error) {
      if (!(error instanceof PaymentGatewayError)) {
        throw error;
      }
      await this.refunds.update(tx, refund.id, {
        status: 'failed',
        failureMessage: error.message,
        completedAt: now,
      });
    }
    return (await this.refunds.findById(tx, refund.id)) ?? refund;
  }
}
