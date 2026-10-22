import { paymentAccounts, payments, paymentWebhookEvents, refunds } from '@wattwisely/db';

/** One payments row, as the tables define it. */
export type PaymentRow = typeof payments.$inferSelect;
export type PaymentStatus = PaymentRow['status'];
export type NewPayment = typeof payments.$inferInsert;

/** One payment_accounts row. */
export type PaymentAccountRow = typeof paymentAccounts.$inferSelect;
export type PaymentAccountStatus = PaymentAccountRow['status'];
export type NewPaymentAccount = typeof paymentAccounts.$inferInsert;

/** One refunds row. */
export type RefundRow = typeof refunds.$inferSelect;
export type RefundStatus = RefundRow['status'];
export type NewRefund = typeof refunds.$inferInsert;

/** One payment_webhook_events row. */
export type WebhookEventRow = typeof paymentWebhookEvents.$inferSelect;

/** The states in which a payment still holds (or may still take) the driver's money. */
export class PaymentStatuses {
  static readonly OPEN: PaymentStatus[] = ['pending', 'authorised'];
  static readonly SETTLED: PaymentStatus[] = ['captured', 'partially_refunded', 'refunded'];
  static readonly ALL: PaymentStatus[] = [
    'pending',
    'authorised',
    'captured',
    'released',
    'failed',
    'capture_failed',
    'partially_refunded',
    'refunded',
  ];

  static isStatus(value: string): value is PaymentStatus {
    return (PaymentStatuses.ALL as string[]).includes(value);
  }

  /** Captured money that can still be refunded. */
  static isRefundable(status: PaymentStatus): boolean {
    return status === 'captured' || status === 'partially_refunded';
  }
}
