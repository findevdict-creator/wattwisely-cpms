import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntryDto } from './dto/audit-log-entry.dto';
import { AuditLogPageDto } from './dto/audit-log-page.dto';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';

/** GET /v1/audit-log: read-only, because the log is append-only. */
@ApiTags('audit-log')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('audit:read')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListAuditLogQueryDto,
  ): Promise<AuditLogPageDto> {
    return this.auditLogService.list(auth.requireAccess(), query);
  }

  @Get(':id')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<AuditLogEntryDto> {
    return this.auditLogService.get(auth.requireAccess(), id);
  }
}
