import { ApiProperty } from '@nestjs/swagger';
import { RefundRow } from '@wattwisely/payments';

/** A refund of part or all of a captured payment. Amounts are minor units of `currency`. */
export class RefundDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly payment_id: string;

  @ApiProperty()
  readonly session_id: string;

  @ApiProperty()
  readonly amount: number;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ example: 'Charger stopped early' })
  readonly reason: string;

  @ApiProperty({ enum: ['awaiting_approval', 'pending', 'succeeded', 'failed', 'cancelled'] })
  readonly status: string;

  @ApiProperty({ nullable: true })
  readonly requested_by: string | null;

  @ApiProperty({ nullable: true, example: 'Olivia Owner <olivia@acme.test>' })
  readonly requested_by_label: string | null;

  @ApiProperty({ nullable: true })
  readonly approved_by: string | null;

  @ApiProperty({ nullable: true })
  readonly approved_by_label: string | null;

  @ApiProperty({ nullable: true, example: 're_3Nv0FGQ9RKHgCVdK0abc1234' })
  readonly provider_refund_id: string | null;

  @ApiProperty({ nullable: true })
  readonly failure_message: string | null;

  @ApiProperty()
  readonly requested_at: string;

  @ApiProperty({ nullable: true })
  readonly approved_at: string | null;

  @ApiProperty({ nullable: true })
  readonly completed_at: string | null;

  @ApiProperty()
  readonly version: number;

  constructor(refund: RefundRow) {
    this.id = refund.id;
    this.payment_id = refund.paymentId;
    this.session_id = refund.sessionId;
    this.amount = refund.amount;
    this.currency = refund.currency;
    this.reason = refund.reason;
    this.status = refund.status;
    this.requested_by = refund.requestedBy;
    this.requested_by_label = refund.requestedByLabel;
    this.approved_by = refund.approvedBy;
    this.approved_by_label = refund.approvedByLabel;
    this.provider_refund_id = refund.providerRefundId;
    this.failure_message = refund.failureMessage;
    this.requested_at = refund.createdAt.toISOString();
    this.approved_at = refund.approvedAt?.toISOString() ?? null;
    this.completed_at = refund.completedAt?.toISOString() ?? null;
    this.version = refund.version;
  }
}
