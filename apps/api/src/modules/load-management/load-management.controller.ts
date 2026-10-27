import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatchAllowingNew } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { LoadManagementDto } from './dto/load-management.dto';
import { UpdateLoadManagementRequestDto } from './dto/update-load-management-request.dto';
import { LoadManagementChangesService } from './load-management-changes.service';
import { LoadManagementService } from './load-management.service';

/**
 * /v1/sites/{siteId}/load-management (module 17, add-on load_management): a site's power cap
 * and how it is shared. Without the add-on the guard answers 403 module_not_in_plan.
 */
@ApiTags('load-management')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('sites/:siteId/load-management')
export class LoadManagementController {
  constructor(
    private readonly service: LoadManagementService,
    private readonly changes: LoadManagementChangesService,
  ) {}

  @Get()
  @RouteAccess.requires('load_management:read')
  view(
    @CurrentAuth() auth: RequestAuth,
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
  ): Promise<LoadManagementDto> {
    return this.service.view(auth.requireAccess(), siteId);
  }

  /** Saves the whole policy and every charger's settings; If-Match 0 for the first save. */
  @Put()
  @RouteAccess.requires('load_management:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
    @IfMatchAllowingNew() version: number,
    @Body() body: UpdateLoadManagementRequestDto,
  ): Promise<LoadManagementDto> {
    return this.changes.update(auth, siteId, version, body);
  }
}
