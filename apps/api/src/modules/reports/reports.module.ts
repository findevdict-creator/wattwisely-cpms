import { Module } from '@nestjs/common';
import { ReportExportsController } from './exports/report-exports.controller';
import { ReportExportsRepository } from './exports/report-exports.repository';
import { ReportExportsService } from './exports/report-exports.service';
import { ReportSchedulesController } from './schedules/report-schedules.controller';
import { ReportSchedulesRepository } from './schedules/report-schedules.repository';
import { ReportSchedulesService } from './schedules/report-schedules.service';
import { OverviewRepository } from './usage/overview.repository';
import { UsageReportController } from './usage/usage-report.controller';
import { UsageReportService } from './usage/usage-report.service';

/** Reports (module 11): usage, uptime and revenue, background exports and scheduled e-mails. */
@Module({
  controllers: [UsageReportController, ReportExportsController, ReportSchedulesController],
  providers: [
    OverviewRepository,
    UsageReportService,
    ReportExportsRepository,
    ReportExportsService,
    ReportSchedulesRepository,
    ReportSchedulesService,
  ],
})
export class ReportsModule {}
