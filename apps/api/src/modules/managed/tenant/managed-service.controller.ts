import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AcceptManagedServiceRequestDto } from '../dto/accept-managed-service-request.dto';
import { ManagedNoticeRequestDto } from '../dto/managed-notice-request.dto';
import { ManagedServiceDto } from '../dto/managed-service.dto';
import { ServiceReportQueryDto } from '../dto/service-report-query.dto';
import { ServiceReportDto } from '../dto/service-report.dto';
import { ServiceReportService } from '../report/service-report.service';
import { ManagedServiceService } from './managed-service.service';

/** /v1/managed-service: the tenant's managed service agreement (Settings, Managed service). */
@ApiTags('managed-service')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('managed-service')
export class ManagedServiceController {
  constructor(
    private readonly service: ManagedServiceService,
    private readonly reports: ServiceReportService,
  ) {}

  @Get()
  @RouteAccess.requires('settings:read')
  get(@CurrentAuth() auth: RequestAuth): Promise<ManagedServiceDto> {
    return this.service.get(auth);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('managed_service:manage')
  accept(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: AcceptManagedServiceRequestDto,
  ): Promise<ManagedServiceDto> {
    return this.service.accept(auth, body);
  }

  @Post('notice')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('managed_service:manage')
  giveNotice(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: ManagedNoticeRequestDto,
  ): Promise<ManagedServiceDto> {
    return this.service.giveNotice(auth, body);
  }

  @Get('report')
  @RouteAccess.requires('settings:read')
  report(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ServiceReportQueryDto,
  ): Promise<ServiceReportDto> {
    return this.reports.forTenant(auth, query.month);
  }
}
