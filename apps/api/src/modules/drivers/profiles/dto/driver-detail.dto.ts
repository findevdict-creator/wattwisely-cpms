import { ApiProperty } from '@nestjs/swagger';
import { RfidCardRecord } from '../../cards/rfid-card-record';
import { RfidCardDto } from '../../cards/dto/rfid-card.dto';
import { DriverSummary } from '../driver-record';
import { DriverDto } from './driver.dto';

/** GET /v1/drivers/{id}: the driver with their cards. */
export class DriverDetailDto extends DriverDto {
  @ApiProperty({ type: [RfidCardDto] }) readonly cards: RfidCardDto[];

  constructor(driver: DriverSummary & { isHidden: boolean }, cards: RfidCardRecord[]) {
    super(driver);
    this.cards = cards.map((card) => new RfidCardDto(card));
  }
}
