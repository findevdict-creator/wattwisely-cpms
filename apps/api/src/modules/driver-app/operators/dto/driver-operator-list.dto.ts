import { ApiProperty } from '@nestjs/swagger';
import { DriverOperatorDto } from './driver-operator.dto';

/** GET /v1/driver/operators: every operator the driver is linked with, by name. */
export class DriverOperatorListDto {
  @ApiProperty({ type: [DriverOperatorDto] })
  readonly items: DriverOperatorDto[];

  constructor(items: DriverOperatorDto[]) {
    this.items = items;
  }
}
