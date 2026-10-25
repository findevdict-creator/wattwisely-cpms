import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverMeService } from './driver-me.service';
import { DriverMeDto } from './dto/driver-me.dto';
import { UpdateDriverMeRequestDto } from './dto/update-driver-me-request.dto';

/** /v1/driver/me: the driver's own account (module 19). Only the driver app's tokens open it. */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/me')
export class DriverMeController {
  constructor(private readonly me: DriverMeService) {}

  @Get()
  describe(@CurrentAuth() auth: RequestAuth): DriverMeDto {
    return this.me.describe(auth);
  }

  @Patch()
  update(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: UpdateDriverMeRequestDto,
  ): Promise<DriverMeDto> {
    return this.me.update(auth, body);
  }
}
