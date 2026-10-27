import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { RateLimit } from '../../../common/rate-limit/rate-limit.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverChargesService } from './driver-charges.service';
import { DriverChargeDetailDto } from './dto/driver-charge-detail.dto';
import { DriverChargeListDto } from './dto/driver-charge-list.dto';
import { StartDriverChargeRequestDto } from './dto/start-driver-charge-request.dto';

/**
 * /v1/driver/charges: a logged-in driver's own charges (module 19). Starting one needs no
 * card form: the hold comes from the saved card, or nothing is held when the rule says free.
 */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/charges')
export class DriverChargesController {
  constructor(private readonly service: DriverChargesService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<DriverChargeListDto> {
    return this.service.list(auth);
  }

  /** Before :id, so "export" is not read as an id. */
  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="my-charges.csv"')
  export(@CurrentAuth() auth: RequestAuth): Promise<string> {
    return this.service.export(auth);
  }

  @Post()
  @RateLimit.policy('public_write')
  start(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: StartDriverChargeRequestDto,
  ): Promise<DriverChargeDetailDto> {
    return this.service.start(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<DriverChargeDetailDto> {
    return this.service.get(auth, id);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<DriverChargeDetailDto> {
    return this.service.stop(auth, id);
  }
}
