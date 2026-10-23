import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';
import { NotificationSettingsService } from './notification-settings.service';

/** /v1/notification-settings: the caller's quiet hours in the chosen tenant. */
@ApiTags('notifications')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.anyMember()
@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly settingsService: NotificationSettingsService) {}

  @Get()
  get(@CurrentAuth() auth: RequestAuth): Promise<NotificationSettingsDto> {
    return this.settingsService.get(auth.requireAccess());
  }

  @Put()
  update(
    @CurrentAuth() auth: RequestAuth,
    @Body() request: UpdateNotificationSettingsRequestDto,
  ): Promise<NotificationSettingsDto> {
    return this.settingsService.update(auth.requireAccess(), request);
  }
}
