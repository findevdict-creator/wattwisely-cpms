import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ConnectorsService } from './connectors.service';
import { AddConnectorRequestDto } from './dto/add-connector-request.dto';
import { ConnectorDto } from './dto/connector.dto';
import { UpdateConnectorRequestDto } from './dto/update-connector-request.dto';

/** /v1/chargers/{id}/connectors and /v1/connectors/{id}: the plugs on a charger (story AST-03). */
@ApiTags('chargers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller()
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get('chargers/:chargerId/connectors')
  @RouteAccess.requires('chargers:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Param('chargerId') chargerId: string,
  ): Promise<ConnectorDto[]> {
    return this.connectorsService.list(auth, chargerId);
  }

  @Post('chargers/:chargerId/connectors')
  @RouteAccess.requires('chargers:write')
  add(
    @CurrentAuth() auth: RequestAuth,
    @Param('chargerId') chargerId: string,
    @Body() body: AddConnectorRequestDto,
  ): Promise<ConnectorDto> {
    return this.connectorsService.add(auth, chargerId, body);
  }

  @Patch('connectors/:id')
  @RouteAccess.requires('chargers:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateConnectorRequestDto,
  ): Promise<ConnectorDto> {
    return this.connectorsService.update(auth, id, version, body);
  }

  @Delete('connectors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('chargers:write')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.connectorsService.remove(auth, id, version);
  }
}
