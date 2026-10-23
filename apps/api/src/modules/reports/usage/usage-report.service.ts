import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { UsageCsv, UsageReport, UsageReportBuilder } from '@wattwisely/reports';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ReportPeriod } from '../report-period';
import { OverviewDto } from './dto/overview.dto';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import { UsageReportDto } from './dto/usage-report.dto';
import { OverviewRepository } from './overview.repository';

/**
 * The usage, uptime and revenue report (PRD, Reports) at the sites where the caller holds
 * reports:read, on screen and as CSV, and the home page's numbers.
 */
@Injectable()
export class UsageReportService {
  static readonly DAY_MS = 86_400_000;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly overview: OverviewRepository,
  ) {}

  async report(access: TenantAccess, query: UsageReportQueryDto): Promise<UsageReportDto> {
    return new UsageReportDto(await this.build(access, query));
  }

  async csv(access: TenantAccess, query: UsageReportQueryDto): Promise<string> {
    return UsageCsv.of(await this.build(access, query));
  }

  async summary(access: TenantAccess): Promise<OverviewDto> {
    const scope = SitePermissionChecker.scopeOf(access, 'reports:read');
    const now = new Date();
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const counts = await this.overview.counts(tx, scope);
      const day = await UsageReportBuilder.build(tx, {
        from: new Date(now.getTime() - UsageReportService.DAY_MS),
        to: now,
        groupBy: 'site',
        siteIds: scope.toSiteIds(),
        now,
      });
      return new OverviewDto(counts, day);
    });
  }

  private build(access: TenantAccess, query: UsageReportQueryDto): Promise<UsageReport> {
    const period = ReportPeriod.of(query.from, query.to);
    const scope = SitePermissionChecker.scopeOf(access, 'reports:read');
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      UsageReportBuilder.build(tx, {
        ...period,
        groupBy: query.group_by ?? 'site',
        siteIds: scope.toSiteIds(),
        siteId: query.site_id,
        now: new Date(),
      }),
    );
  }
}
