import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ReportCalendar, ReportFileBuilder, UsageGrouping } from '@wattwisely/reports';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { DueSchedule, ReportSchedulesRepository } from './report-schedules.repository';

/**
 * ReportScheduleJob (module 11, PRD "scheduled e-mail" on the advanced plan): every five
 * minutes, queues the usage report of each schedule that is due, for the week or month just
 * ended, and moves the schedule to its next run. The export job builds and sends it. A
 * worker that was down catches up with one report, not one per missed run.
 */
@Injectable()
export class ReportScheduleJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly runner: TransactionRunner,
    private readonly schedules: ReportSchedulesRepository,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let queued = 0;
    for (const tenantId of await this.tenants.ids()) {
      queued += await this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
        const due = await this.schedules.findDue(tx, now);
        for (const schedule of due) {
          await this.queue(tx, schedule, now);
        }
        return due.length;
      });
    }
    return queued;
  }

  private async queue(tx: Transaction, schedule: DueSchedule, now: Date): Promise<void> {
    const period = ReportCalendar.periodBefore(
      schedule.frequency,
      schedule.timeZone,
      schedule.nextRunAt,
    );
    const from = period.from.toISOString();
    const to = period.to.toISOString();
    const parameters = {
      from,
      to,
      groupBy: schedule.groupBy as UsageGrouping,
      siteIds: null,
      ...(schedule.siteId ? { siteId: schedule.siteId } : {}),
    };
    const fileName = ReportFileBuilder.fileName('usage', from, to, now);
    await this.schedules.queueExport(tx, schedule, parameters, fileName);
    const next = ReportCalendar.nextRun(schedule.frequency, schedule.timeZone, now);
    await this.schedules.advance(tx, schedule.id, next, now);
  }

  protected intervalMs(): number {
    return this.config.reportScheduleIntervalMs;
  }
}
