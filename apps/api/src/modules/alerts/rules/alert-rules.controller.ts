import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AlertRulesService } from './alert-rules.service';
import { AlertRulesDto } from './dto/alert-rules.dto';
import { ReplaceAlertRulesRequestDto } from './dto/replace-alert-rules-request.dto';

/** /v1/alert-rules: who hears about which alerts (Settings, Alerts; story NTF-03). */
@ApiTags('alerts')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly rulesService: AlertRulesService) {}

  @Get()
  @RouteAccess.requires('settings:read')
  get(@CurrentAuth() auth: RequestAuth): Promise<AlertRulesDto> {
    return this.rulesService.get(auth.requireAccess());
  }

  @Put()
  @RouteAccess.requires('settings:write')
  replace(
    @CurrentAuth() auth: RequestAuth,
    @Body() request: ReplaceAlertRulesRequestDto,
  ): Promise<AlertRulesDto> {
    return this.rulesService.replace(auth, request);
  }
}
