import { ApiProperty } from '@nestjs/swagger';
import { NearbySiteRow } from '../nearby-site-details.repository';

/** The plug a tap on a nearby site opens. */
export class NearbyPlugDto {
  @ApiProperty({ example: 'WW-7KQ4M2XR9T' }) readonly charger_identity: string;
  @ApiProperty({ example: 1 }) readonly ocpp_connector_id: number;

  constructor(plug: NonNullable<NearbySiteRow['plug']>) {
    this.charger_identity = plug.charger_identity;
    this.ocpp_connector_id = plug.ocpp_connector_id;
  }
}
