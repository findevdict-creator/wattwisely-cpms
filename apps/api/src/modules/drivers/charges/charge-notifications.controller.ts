import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { ChargeNotificationsService } from './charge-notifications.service';
import { ChargeNotificationsDto } from './dto/charge-notifications.dto';
import { UpdateChargeNotificationsRequestDto } from './dto/update-charge-notifications-request.dto';

/** /v1/public/charges/{key}/notifications: e-mail updates about a charge. The key is the proof. */
@ApiTags('public')
@RouteAccess.public()
@Controller('public/charges')
export class ChargeNotificationsController {
  constructor(private readonly service: ChargeNotificationsService) {}

  @Get(':key/notifications')
  get(@Param('key') key: string): Promise<ChargeNotificationsDto> {
    return this.service.get(key);
  }

  @Put(':key/notifications')
  update(
    @Param('key') key: string,
    @Body() request: UpdateChargeNotificationsRequestDto,
  ): Promise<ChargeNotificationsDto> {
    return this.service.update(key, request);
  }

  @Delete(':key/notifications')
  remove(@Param('key') key: string): Promise<ChargeNotificationsDto> {
    return this.service.remove(key);
  }
}
