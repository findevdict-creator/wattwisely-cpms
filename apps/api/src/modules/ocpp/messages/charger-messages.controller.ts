import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ChargerMessagesService } from './charger-messages.service';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { OcppMessagePageDto } from './dto/ocpp-message-page.dto';

/** GET /v1/chargers/{id}/messages: the raw OCPP frames in and out, newest first. */
@ApiTags('charger-messages')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('chargers/:id/messages')
export class ChargerMessagesController {
  constructor(private readonly messages: ChargerMessagesService) {}

  @Get()
  @RouteAccess.requires('chargers:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<OcppMessagePageDto> {
    return this.messages.list(auth.requireAccess(), id, query);
  }
}
