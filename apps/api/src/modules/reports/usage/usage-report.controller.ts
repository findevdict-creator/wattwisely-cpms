import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { OverviewDto } from './dto/overview.dto';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import { UsageReportDto } from './dto/usage-report.dto';
import { UsageReportService } from './usage-report.service';

/** /v1/reports: usage, uptime and revenue, and the home page's numbers (module 11). */
@ApiTags('reports')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('reports:read')
@Controller('reports')
export class UsageReportController {
  constructor(private readonly reports: UsageReportService) {}

  @Get('overview')
  overview(@CurrentAuth() auth: RequestAuth): Promise<OverviewDto> {
    return this.reports.summary(auth.requireAccess());
  }

  @Get('usage')
  usage(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: UsageReportQueryDto,
  ): Promise<UsageReportDto> {
    return this.reports.report(auth.requireAccess(), query);
  }

  @Get('usage/export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="usage.csv"')
  usageCsv(@CurrentAuth() auth: RequestAuth, @Query() query: UsageReportQueryDto): Promise<string> {
    return this.reports.csv(auth.requireAccess(), query);
  }
}
