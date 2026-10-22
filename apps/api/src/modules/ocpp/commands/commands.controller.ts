import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ChargerCommandsService } from './charger-commands.service';
import { CommandDto } from './dto/command.dto';

/** GET /v1/commands/{id}: where a command got to (queued, sent, accepted…). */
@ApiTags('charger-commands')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('commands')
export class CommandsController {
  constructor(private readonly commands: ChargerCommandsService) {}

  @Get(':id')
  @RouteAccess.requires('chargers:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<CommandDto> {
    return this.commands.get(auth.requireAccess(), id);
  }
}
