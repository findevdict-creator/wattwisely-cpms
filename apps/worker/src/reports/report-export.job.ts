import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { ReportExporter } from './report-exporter';

/**
 * ReportExportJob (module 11): every 15 seconds, builds the queued exports, at most 5 per
 * tenant per run, and drops the files of exports older than 7 days.
 */
@Injectable()
export class ReportExportJob extends IntervalJob {
  static readonly BATCH = 5;

  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly exporter: ReportExporter,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let handled = 0;
    for (const tenantId of await this.tenants.ids()) {
      for (let count = 0; count < ReportExportJob.BATCH; count += 1) {
        if (!(await this.exporter.buildNext(tenantId, now))) {
          break;
        }
        handled += 1;
      }
      await this.exporter.expire(tenantId, now);
    }
    return handled;
  }

  protected intervalMs(): number {
    return this.config.reportExportIntervalMs;
  }
}
