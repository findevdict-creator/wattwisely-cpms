import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { AlertsService } from './alerts.service';
import { AcknowledgeAlertRequestDto } from './dto/acknowledge-alert-request.dto';
import { AlertPageDto } from './dto/alert-page.dto';
import { AlertSummaryDto } from './dto/alert-summary.dto';
import { AlertDto } from './dto/alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';

/** /v1/alerts: charger problems the worker found, for the people who look after them (NTF-04). */
@ApiTags('alerts')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RouteAccess.requires('alerts:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListAlertsQueryDto,
  ): Promise<AlertPageDto> {
    return this.alertsService.list(auth.requireAccess(), query);
  }

  /** Before :id, so "summary" is not read as an id. */
  @Get('summary')
  @RouteAccess.requires('alerts:read')
  summary(@CurrentAuth() auth: RequestAuth): Promise<AlertSummaryDto> {
    return this.alertsService.summary(auth.requireAccess());
  }

  @Get(':id')
  @RouteAccess.requires('alerts:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<AlertDto> {
    return this.alertsService.get(auth.requireAccess(), id);
  }

  /** Someone is on it: the alert stays until the problem clears, marked as seen to. */
  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('alerts:acknowledge')
  acknowledge(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() request: AcknowledgeAlertRequestDto,
    @IfMatch() version: number,
  ): Promise<AlertDto> {
    return this.alertsService.acknowledge(auth, id, request, version);
  }
}
