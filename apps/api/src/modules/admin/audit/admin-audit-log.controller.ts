import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';
import { PlatformAuditPageDto } from './dto/platform-audit-page.dto';

/** GET /v1/admin/audit-log: who changed what, on any tenant or the platform itself. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/audit-log')
export class AdminAuditLogController {
  constructor(private readonly auditLog: AdminAuditLogService) {}

  @Get()
  @RouteAccess.platform('platform_audit:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: AdminAuditLogQueryDto,
  ): Promise<PlatformAuditPageDto> {
    return this.auditLog.list(auth, query);
  }
}
