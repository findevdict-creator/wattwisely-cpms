import { ApiProperty } from '@nestjs/swagger';
import { DriverChargeRecord } from '../driver-charge-record';
import { DriverChargeDto } from './driver-charge.dto';

/** GET /v1/driver/charges: the driver's newest charges across all their operators. */
export class DriverChargeListDto {
  @ApiProperty({ type: [DriverChargeDto] })
  readonly items: DriverChargeDto[];

  constructor(records: DriverChargeRecord[]) {
    this.items = records.map((record) => new DriverChargeDto(record));
  }
}
