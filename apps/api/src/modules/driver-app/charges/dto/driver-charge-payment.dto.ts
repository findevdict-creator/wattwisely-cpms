import { ApiProperty } from '@nestjs/swagger';
import { DriverChargeRecord } from '../driver-charge-record';

/** The card hold behind a paid charge, as the driver may see it. */
export class DriverChargePaymentDto {
  @ApiProperty() readonly status: string;
  @ApiProperty({ description: 'Held on the card at the start, in minor units' })
  readonly hold_amount: number;
  @ApiProperty({ nullable: true }) readonly card_brand: string | null;
  @ApiProperty({ nullable: true }) readonly card_last4: string | null;
  @ApiProperty({ nullable: true, description: 'Why the card was refused, when it was' })
  readonly failure_message: string | null;

  constructor(record: DriverChargeRecord, status: string) {
    this.status = status;
    this.hold_amount = record.holdAmount ?? 0;
    this.card_brand = record.cardBrand;
    this.card_last4 = record.cardLast4;
    this.failure_message = record.failureMessage;
  }
}
