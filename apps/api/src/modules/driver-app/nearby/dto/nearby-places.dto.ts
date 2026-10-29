import { ApiProperty } from '@nestjs/swagger';
import { NearbyPlaceDto } from './nearby-place.dto';

/** GET /v1/driver/places/nearby: the sites in the circle, nearest first. */
export class NearbyPlacesDto {
  @ApiProperty({ type: [NearbyPlaceDto] }) readonly items: NearbyPlaceDto[];

  constructor(items: NearbyPlaceDto[]) {
    this.items = items;
  }
}
