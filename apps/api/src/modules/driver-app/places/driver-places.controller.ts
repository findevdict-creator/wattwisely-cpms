import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverPlaceDto } from './dto/driver-place.dto';
import { DriverPlacesService } from './driver-places.service';

/**
 * /v1/driver/places/{identity}/{connector}: the plug a QR code names, as the logged-in driver
 * sees it (module 19). The public route answers the same facts without the access block.
 */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/places')
export class DriverPlacesController {
  constructor(private readonly service: DriverPlacesService) {}

  @Get(':identity/:connector')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('identity') identity: string,
    @Param('connector') connector: string,
  ): Promise<DriverPlaceDto> {
    return this.service.get(auth, identity, connector);
  }
}
