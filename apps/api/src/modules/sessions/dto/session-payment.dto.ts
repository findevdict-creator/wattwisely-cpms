import { ApiProperty } from '@nestjs/swagger';
import { PaymentRow, PaymentStatuses, RefundRow } from '@wattwisely/payments';
import { RefundDto } from '../../payments/refunds/dto/refund.dto';

/** The card payment of a session with its refunds, as the session detail reads them. */
export interface SessionPayment {
  payment: PaymentRow;
  refunds: RefundRow[];
}

/** The card payment on a session page. Amounts are minor units of `currency`. */
export class SessionPaymentDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: PaymentStatuses.ALL })
  readonly status: string;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ description: 'Held on the card at the start' })
  readonly hold_amount: number;

  @ApiProperty({ nullable: true })
  readonly authorized_amount: number | null;

  @ApiProperty({ nullable: true, description: 'What was taken at the end' })
  readonly captured_amount: number | null;

  @ApiProperty()
  readonly refunded_amount: number;

  @ApiProperty({ example: 'stripe' })
  readonly provider: string;

  @ApiProperty()
  readonly provider_payment_id: string;

  @ApiProperty({ nullable: true, example: 'visa' })
  readonly card_brand: string | null;

  @ApiProperty({ nullable: true, example: '4242' })
  readonly card_last4: string | null;

  @ApiProperty({ nullable: true })
  readonly failure_message: string | null;

  @ApiProperty({ type: [String], example: ['capture_above_hold'] })
  readonly review_flags: string[];

  @ApiProperty({ nullable: true })
  readonly authorized_at: string | null;

  @ApiProperty({ nullable: true })
  readonly captured_at: string | null;

  @ApiProperty({ nullable: true })
  readonly released_at: string | null;

  @ApiProperty({ nullable: true })
  readonly failed_at: string | null;

  @ApiProperty({ type: [RefundDto], description: 'Newest first' })
  readonly refunds: RefundDto[];

  constructor({ payment, refunds }: SessionPayment) {
    this.id = payment.id;
    this.status = payment.status;
    this.currency = payment.currency;
    this.hold_amount = payment.holdAmount;
    this.authorized_amount = payment.authorizedAmount;
    this.captured_amount = payment.capturedAmount;
    this.refunded_amount = payment.refundedAmount;
    this.provider = payment.provider;
    this.provider_payment_id = payment.providerPaymentId;
    this.card_brand = payment.cardBrand;
    this.card_last4 = payment.cardLast4;
    this.failure_message = payment.failureMessage;
    this.review_flags = payment.reviewFlags;
    this.authorized_at = payment.authorizedAt?.toISOString() ?? null;
    this.captured_at = payment.capturedAt?.toISOString() ?? null;
    this.released_at = payment.releasedAt?.toISOString() ?? null;
    this.failed_at = payment.failedAt?.toISOString() ?? null;
    this.refunds = refunds.map((refund) => new RefundDto(refund));
  }
}
