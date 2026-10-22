import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ChargerCommandsService } from './charger-commands.service';
import { ChangeAvailabilityRequestDto } from './dto/change-availability-request.dto';
import { CommandDto } from './dto/command.dto';
import { CommandPageDto } from './dto/command-page.dto';
import { ListCommandsQueryDto } from './dto/list-commands-query.dto';
import { RemoteStartRequestDto } from './dto/remote-start-request.dto';
import { RemoteStopRequestDto } from './dto/remote-stop-request.dto';
import { ResetRequestDto } from './dto/reset-request.dto';
import { UnlockRequestDto } from './dto/unlock-request.dto';

/**
 * /v1/chargers/{id}/commands: one endpoint per command, so each has its own body and
 * check (API Design, "Charger commands"). Every command answers 202 at once; the result
 * arrives on the charger's live stream and in GET /v1/commands/{id}.
 */
@ApiTags('charger-commands')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('chargers/:id/commands')
export class ChargerCommandsController {
  constructor(private readonly commands: ChargerCommandsService) {}

  @Get()
  @RouteAccess.requires('chargers:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Query() query: ListCommandsQueryDto,
  ): Promise<CommandPageDto> {
    return this.commands.list(auth.requireAccess(), id, query);
  }

  @Post('remote-start')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteAccess.requires('chargers:command')
  remoteStart(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: RemoteStartRequestDto,
  ): Promise<CommandDto> {
    return this.commands.send(auth, id, 'remote_start', body);
  }

  @Post('remote-stop')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteAccess.requires('chargers:command')
  remoteStop(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: RemoteStopRequestDto,
  ): Promise<CommandDto> {
    return this.commands.send(auth, id, 'remote_stop', body);
  }

  /** Never queued: an offline charger answers 409 charger_offline. */
  @Post('reset')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteAccess.requires('chargers:command')
  reset(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: ResetRequestDto,
  ): Promise<CommandDto> {
    return this.commands.send(auth, id, 'reset', body);
  }

  @Post('unlock')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteAccess.requires('chargers:command')
  unlock(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: UnlockRequestDto,
  ): Promise<CommandDto> {
    return this.commands.send(auth, id, 'unlock', body);
  }

  @Post('change-availability')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteAccess.requires('chargers:command')
  changeAvailability(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: ChangeAvailabilityRequestDto,
  ): Promise<CommandDto> {
    return this.commands.send(auth, id, 'change_availability', body);
  }
}
