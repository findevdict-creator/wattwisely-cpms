import { ApiProperty } from '@nestjs/swagger';
import { RefundDto } from '../../refunds/dto/refund.dto';
import { PaymentRecord } from '../payment-record';
import { PaymentDto } from './payment.dto';

/** GET /v1/payments/{id}: the payment with its refunds, newest first. */
export class PaymentDetailDto extends PaymentDto {
  @ApiProperty({ type: [RefundDto] })
  readonly refunds: RefundDto[];

  constructor(payment: PaymentRecord, refunds: RefundDto[]) {
    super(payment);
    this.refunds = refunds;
  }
}
