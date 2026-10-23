import { PaymentRow, PaymentStatuses, RefundRow } from '../store/payment-rows';

/**
 * Who may refund what (Stripe Payments design, "Refunds"): up to 100.00 one person with
 * payments:refund sends it; above that a second person with payments:approve_refund, who
 * is not the requester, must approve. Never more than what was captured and not yet refunded.
 */
export class RefundPolicy {
  /** In minor units: 100.00 in a two-decimal currency. */
  static readonly APPROVAL_LIMIT = 10_000;

  static needsApproval(amount: number): boolean {
    return amount > RefundPolicy.APPROVAL_LIMIT;
  }

  /** What may still be refunded, after refunds done or waiting. */
  static available(payment: PaymentRow, reservedAmount: number): number {
    if (!PaymentStatuses.isRefundable(payment.status)) {
      return 0;
    }
    return Math.max(0, (payment.capturedAmount ?? 0) - reservedAmount);
  }

  static canApprove(refund: RefundRow, approverAccountId: string): boolean {
    return refund.status === 'awaiting_approval' && refund.requestedBy !== approverAccountId;
  }

  /** The payment's status after another `amount` came back to the driver. */
  static statusAfterRefund(payment: PaymentRow, refundedAmount: number): PaymentRow['status'] {
    return refundedAmount >= (payment.capturedAmount ?? 0) ? 'refunded' : 'partially_refunded';
  }
}
