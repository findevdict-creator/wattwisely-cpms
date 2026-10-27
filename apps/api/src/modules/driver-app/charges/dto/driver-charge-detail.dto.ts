import { ApiProperty } from '@nestjs/swagger';
import { SessionStates } from '@wattwisely/session-engine';
import { ChargeOutcome } from '../../../payments/public/charge-receipt.lookup';
import { ChargeReceiptDto } from '../../../payments/public/dto/charge-receipt.dto';
import { DriverChargeRecord } from '../driver-charge-record';
import { DriverChargeDto } from './driver-charge.dto';

/** What the detail page needs on top of the record. */
export interface DriverChargeDetails {
  outcome: ChargeOutcome;
  isStopRequested: boolean;
  /** Only in the answer to a paid start: the public charge page's key. */
  chargeKey: string | null;
}

/** One charge in full: the list's facts, the receipt once priced, and whether it can be stopped. */
export class DriverChargeDetailDto extends DriverChargeDto {
  @ApiProperty({
    type: ChargeReceiptDto,
    nullable: true,
    description: 'Once the final price is known',
  })
  readonly receipt: ChargeReceiptDto | null;

  @ApiProperty({ description: 'True while the driver may ask the charger to stop' })
  readonly can_stop: boolean;

  @ApiProperty({ description: 'A stop was asked for and the charger has not stopped yet' })
  readonly is_stop_requested: boolean;

  @ApiProperty({
    nullable: true,
    description:
      'Right after a paid start only: the key the public charge page follows the hold with',
  })
  readonly charge_key: string | null;

  constructor(record: DriverChargeRecord, details: DriverChargeDetails) {
    super(record);
    this.receipt = details.outcome.pricedAt
      ? new ChargeReceiptDto(details.outcome, details.outcome.pricedAt)
      : null;
    this.can_stop = SessionStates.isActive(record.status) && record.ocppTransactionId !== null;
    this.is_stop_requested = details.isStopRequested;
    this.charge_key = details.chargeKey;
  }
}
