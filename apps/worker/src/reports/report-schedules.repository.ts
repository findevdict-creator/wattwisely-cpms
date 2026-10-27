import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte } from 'drizzle-orm';
import { reportExports, reportSchedules, Transaction, UuidV7 } from '@wattwisely/db';
import { ReportFrequency, UsageExportParameters } from '@wattwisely/reports';

/** A schedule whose run is due. */
export interface DueSchedule {
  id: string;
  tenantId: string;
  frequency: ReportFrequency;
  groupBy: string;
  siteId: string | null;
  timeZone: string;
  nextRunAt: Date;
  createdBy: string | null;
}

/** Reads due schedules and queues their exports. Every query runs inside one tenant. */
@Injectable()
export class ReportSchedulesRepository {
  async findDue(tx: Transaction, now: Date): Promise<DueSchedule[]> {
    const rows = await tx
      .select({
        id: reportSchedules.id,
        tenantId: reportSchedules.tenantId,
        frequency: reportSchedules.frequency,
        groupBy: reportSchedules.groupBy,
        siteId: reportSchedules.siteId,
        timeZone: reportSchedules.timeZone,
        nextRunAt: reportSchedules.nextRunAt,
        createdBy: reportSchedules.createdBy,
      })
      .from(reportSchedules)
      .where(and(eq(reportSchedules.isActive, true), lte(reportSchedules.nextRunAt, now)))
      .orderBy(asc(reportSchedules.nextRunAt))
      .for('update', { skipLocked: true });
    return rows;
  }

  async queueExport(
    tx: Transaction,
    schedule: DueSchedule,
    parameters: UsageExportParameters,
    fileName: string,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(reportExports).values({
      id,
      tenantId: schedule.tenantId,
      kind: 'usage',
      parameters: { ...parameters },
      requestedBy: schedule.createdBy,
      scheduleId: schedule.id,
      fileName,
    });
    return id;
  }

  async advance(tx: Transaction, scheduleId: string, nextRunAt: Date, now: Date): Promise<void> {
    await tx
      .update(reportSchedules)
      .set({ nextRunAt, lastRunAt: now, updatedAt: now })
      .where(eq(reportSchedules.id, scheduleId));
  }
}
