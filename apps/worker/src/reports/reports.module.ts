import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { ExportNotices } from './export-notices';
import { ReportExportJob } from './report-export.job';
import { ReportExporter } from './report-exporter';
import { ReportExportsRepository } from './report-exports.repository';
import { ReportScheduleJob } from './report-schedule.job';
import { ReportSchedulesRepository } from './report-schedules.repository';

/** The report jobs (module 11): background exports and scheduled reports. */
@Module({
  imports: [SessionJobsModule, NotificationsModule],
  providers: [
    ReportExportsRepository,
    ReportSchedulesRepository,
    ExportNotices,
    ReportExporter,
    ReportExportJob,
    ReportScheduleJob,
  ],
})
export class ReportsModule {}
