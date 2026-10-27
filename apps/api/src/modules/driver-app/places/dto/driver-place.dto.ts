import { ApiProperty } from '@nestjs/swagger';
import { PublicPlaceDto, PublicPlaceView } from '../../../drivers/places/dto/public-place.dto';
import { DriverPlaceAccessDto } from './driver-place-access.dto';

/** A plug as the logged-in driver sees it: the public page's facts, plus their own access to it (module 19). */
export class DriverPlaceDto extends PublicPlaceDto {
  @ApiProperty({ type: DriverPlaceAccessDto })
  readonly access: DriverPlaceAccessDto;

  constructor(view: PublicPlaceView, access: DriverPlaceAccessDto) {
    super(view);
    this.access = access;
  }
}
