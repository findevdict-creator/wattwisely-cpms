import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ChargerLiveService } from './charger-live.service';

/**
 * GET /v1/chargers/{id}/live: a server-sent event stream. Each event's type is the
 * ChargerEvent type (connector.status, session.updated, command.result, charger.*)
 * and its data the whole event as JSON. Browsers send the token in a header, so the
 * portal reads the stream with fetch instead of EventSource.
 */
@ApiTags('chargers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('chargers/:id/live')
export class ChargerLiveController {
  constructor(private readonly live: ChargerLiveService) {}

  @Sse()
  @RouteAccess.requires('chargers:read')
  stream(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    return this.live.stream(auth.requireAccess(), id);
  }
}
