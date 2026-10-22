import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { PublicPlaceDto } from './dto/public-place.dto';
import { PublicPlaceService } from './public-place.service';

/**
 * /v1/public/places/{identity}/{connector}: what the QR code on a plug leads to. Public,
 * because the driver has no account: the QR code names the charger and the plug, and
 * the answer holds nothing a passer-by could not read off the charger and its price sign.
 */
@ApiTags('public')
@RouteAccess.public()
@Controller('public/places')
export class PublicPlaceController {
  constructor(private readonly service: PublicPlaceService) {}

  @Get(':identity/:connector')
  get(
    @Param('identity') identity: string,
    @Param('connector') connector: string,
  ): Promise<PublicPlaceDto> {
    return this.service.get(identity, connector);
  }
}
