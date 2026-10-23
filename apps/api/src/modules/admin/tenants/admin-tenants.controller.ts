import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminTenantDto } from './dto/admin-tenant.dto';
import { AdminTenantPageDto } from './dto/admin-tenant-page.dto';
import { CreateTenantRequestDto } from './dto/create-tenant-request.dto';
import { CreateTenantResultDto } from './dto/create-tenant-result.dto';
import { DeleteTenantRequestDto } from './dto/delete-tenant-request.dto';
import { ListAdminTenantsQueryDto } from './dto/list-admin-tenants-query.dto';
import { TenantReasonRequestDto } from './dto/tenant-reason-request.dto';
import { UpdateTenantRequestDto } from './dto/update-tenant-request.dto';
import { TenantCreationService } from './tenant-creation.service';
import { TenantLifecycleService } from './tenant-lifecycle.service';

/** /v1/admin/tenants: every tenant on the platform, for Wattwisely staff (stories ADM-01, 02, 04). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(
    private readonly tenants: AdminTenantsService,
    private readonly creation: TenantCreationService,
    private readonly lifecycle: TenantLifecycleService,
  ) {}

  @Get()
  @RouteAccess.platform('tenants:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListAdminTenantsQueryDto,
  ): Promise<AdminTenantPageDto> {
    return this.tenants.list(auth, query);
  }

  @Get(':id')
  @RouteAccess.platform('tenants:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<AdminTenantDto> {
    return this.tenants.get(auth, id);
  }

  @Post()
  @RouteAccess.platform('tenants:write')
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateTenantRequestDto,
  ): Promise<CreateTenantResultDto> {
    return this.creation.create(auth, body);
  }

  @Patch(':id')
  @RouteAccess.platform('tenants:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateTenantRequestDto,
  ): Promise<AdminTenantDto> {
    return this.tenants.update(auth, id, version, body);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @RouteAccess.platform('tenants:suspend')
  suspend(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: TenantReasonRequestDto,
  ): Promise<AdminTenantDto> {
    return this.lifecycle.suspend(auth, { tenantId: id, version, reason: body.reason });
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @RouteAccess.platform('tenants:suspend')
  reactivate(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: TenantReasonRequestDto,
  ): Promise<AdminTenantDto> {
    return this.lifecycle.reactivate(auth, { tenantId: id, version, reason: body.reason });
  }

  /** A POST, not a DELETE: it needs a body (the typed short name) and nothing is removed. */
  @Post(':id/delete')
  @HttpCode(200)
  @RouteAccess.platform('tenants:delete')
  delete(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: DeleteTenantRequestDto,
  ): Promise<AdminTenantDto> {
    return this.lifecycle.delete(auth, { tenantId: id, version, ...body });
  }
}
