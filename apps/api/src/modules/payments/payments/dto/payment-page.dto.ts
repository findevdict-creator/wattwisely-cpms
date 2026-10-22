import { ApiProperty } from '@nestjs/swagger';
import { PaymentDto } from './payment.dto';

/** One page of GET /v1/payments. */
export class PaymentPageDto {
  @ApiProperty({ type: [PaymentDto] })
  readonly items: PaymentDto[];

  @ApiProperty({ nullable: true, description: 'Pass as cursor for the next page' })
  readonly next_cursor: string | null;

  constructor(items: PaymentDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
