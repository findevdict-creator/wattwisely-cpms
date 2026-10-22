import { ApiProperty } from '@nestjs/swagger';
import { ChargerSetupCardDto } from './charger-setup-card.dto';
import { ChargerDto } from './charger.dto';

/** Answer of POST /v1/chargers and the password endpoint: the charger and its setup card. */
export class RegisteredChargerDto {
  @ApiProperty({ type: ChargerDto })
  readonly charger: ChargerDto;

  @ApiProperty({ type: ChargerSetupCardDto })
  readonly setup: ChargerSetupCardDto;

  constructor(charger: ChargerDto, setup: ChargerSetupCardDto) {
    this.charger = charger;
    this.setup = setup;
  }
}
