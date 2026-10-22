import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatuses } from '@wattwisely/payments';
import { PaymentRecord } from '../payment-record';
import { PaymentPlaceDto } from './payment-place.dto';

/** A payment as GET /v1/payments lists it. Amounts are minor units of `currency`. */
export class PaymentDto extends PaymentPlaceDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly session_id: string;

  @ApiProperty({ enum: ['preauth', 'prepay', 'postpay'] })
  readonly type: string;

  @ApiProperty({ enum: PaymentStatuses.ALL })
  readonly status: string;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ description: 'Held on the card at the start' })
  readonly hold_amount: number;

  @ApiProperty({ nullable: true, description: 'What the card issuer confirmed' })
  readonly authorized_amount: number | null;

  @ApiProperty({ nullable: true, description: 'What was taken at the end' })
  readonly captured_amount: number | null;

  @ApiProperty({ description: 'Given back so far' })
  readonly refunded_amount: number;

  @ApiProperty({ example: 'stripe' })
  readonly provider: string;

  @ApiProperty({ example: 'pi_3Nv0FGQ9RKHgCVdK0abc1234' })
  readonly provider_payment_id: string;

  @ApiProperty({ nullable: true, example: 'visa' })
  readonly card_brand: string | null;

  @ApiProperty({ nullable: true, example: '4242' })
  readonly card_last4: string | null;

  @ApiProperty({ nullable: true })
  readonly failure_code: string | null;

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

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty()
  readonly version: number;

  constructor(payment: PaymentRecord) {
    super(payment);
    this.id = payment.id;
    this.session_id = payment.sessionId;
    this.type = payment.type;
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
    this.failure_code = payment.failureCode;
    this.failure_message = payment.failureMessage;
    this.review_flags = payment.reviewFlags;
    this.authorized_at = payment.authorizedAt?.toISOString() ?? null;
    this.captured_at = payment.capturedAt?.toISOString() ?? null;
    this.released_at = payment.releasedAt?.toISOString() ?? null;
    this.failed_at = payment.failedAt?.toISOString() ?? null;
    this.created_at = payment.createdAt.toISOString();
    this.version = payment.version;
  }
}
