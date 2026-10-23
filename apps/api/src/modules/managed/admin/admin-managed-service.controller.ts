import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ManagedNoticeRequestDto } from '../dto/managed-notice-request.dto';
import { ManagedServiceDto } from '../dto/managed-service.dto';
import { OfferManagedServiceRequestDto } from '../dto/offer-managed-service-request.dto';
import { ServiceReportQueryDto } from '../dto/service-report-query.dto';
import { ServiceReportDto } from '../dto/service-report.dto';
import { UpdateManagedServiceRequestDto } from '../dto/update-managed-service-request.dto';
import { ServiceReportService } from '../report/service-report.service';
import { AdminManagedServiceService } from './admin-managed-service.service';

/** /v1/admin/tenants/{id}/managed-service: a tenant's managed service agreement, for Wattwisely staff. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/tenants/:tenantId/managed-service')
export class AdminManagedServiceController {
  constructor(
    private readonly service: AdminManagedServiceService,
    private readonly reports: ServiceReportService,
  ) {}

  @Get()
  @RouteAccess.platform('tenants:read')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
  ): Promise<ManagedServiceDto> {
    return this.service.get(auth, tenantId);
  }

  @Post()
  @RouteAccess.platform('tenants:manage_service')
  offer(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @Body() body: OfferManagedServiceRequestDto,
  ): Promise<ManagedServiceDto> {
    return this.service.offer(auth, tenantId, body);
  }

  @Patch()
  @RouteAccess.platform('tenants:manage_service')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @IfMatch() version: number,
    @Body() body: UpdateManagedServiceRequestDto,
  ): Promise<ManagedServiceDto> {
    return this.service.update(auth, { tenantId, version }, body);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.platform('tenants:manage_service')
  withdraw(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @IfMatch() version: number,
  ): Promise<ManagedServiceDto> {
    return this.service.withdraw(auth, { tenantId, version });
  }

  @Post('notice')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.platform('tenants:manage_service')
  giveNotice(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @IfMatch() version: number,
    @Body() body: ManagedNoticeRequestDto,
  ): Promise<ManagedServiceDto> {
    return this.service.giveNotice(auth, { tenantId, version }, body);
  }

  @Get('report')
  @RouteAccess.platform('tenants:read')
  report(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @Query() query: ServiceReportQueryDto,
  ): Promise<ServiceReportDto> {
    return this.reports.forStaff(auth, tenantId, query.month);
  }
}
