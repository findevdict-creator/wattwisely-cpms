import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { NearbyPlacesDto } from './dto/nearby-places.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { NearbyPlacesService } from './nearby-places.service';

/** /v1/driver/places/nearby: the charging sites near the phone, for the app's Home (module 35). */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/places')
export class NearbyPlacesController {
  constructor(private readonly service: NearbyPlacesService) {}

  @Get('nearby')
  near(@CurrentAuth() auth: RequestAuth, @Query() query: NearbyQueryDto): Promise<NearbyPlacesDto> {
    return this.service.near(auth, query);
  }
}
