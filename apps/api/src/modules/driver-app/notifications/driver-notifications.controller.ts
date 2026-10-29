import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverNotificationsService } from './driver-notifications.service';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { RegisterDeviceRequestDto } from './dto/register-device-request.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';

/**
 * /v1/driver/me/notifications and /v1/driver/devices (module 34): what the driver hears about
 * their charges, and the phones pushes go to. The mobile app registers a phone after sign-in
 * and removes it at sign-out.
 */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver')
export class DriverNotificationsController {
  constructor(private readonly service: DriverNotificationsService) {}

  @Get('me/notifications')
  get(@CurrentAuth() auth: RequestAuth): Promise<NotificationSettingsDto> {
    return this.service.get(auth);
  }

  @Put('me/notifications')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: UpdateNotificationSettingsRequestDto,
  ): Promise<NotificationSettingsDto> {
    return this.service.update(auth, body);
  }

  @Put('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  register(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: RegisterDeviceRequestDto,
  ): Promise<void> {
    return this.service.register(auth, body);
  }

  @Delete('devices/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(@CurrentAuth() auth: RequestAuth, @Param('token') token: string): Promise<void> {
    return this.service.unregister(auth, token);
  }
}
