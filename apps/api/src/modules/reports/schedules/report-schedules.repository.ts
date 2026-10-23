import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { reportSchedules, sites, Transaction, UuidV7 } from '@wattwisely/db';
import { ReportFrequency } from '@wattwisely/reports';

/** A schedule as the settings show it. */
export interface ReportScheduleRecord {
  id: string;
  name: string;
  frequency: ReportFrequency;
  groupBy: string;
  siteId: string | null;
  siteName: string | null;
  recipients: string[];
  timeZone: string;
  isActive: boolean;
  nextRunAt: Date;
  lastRunAt: Date | null;
  version: number;
}

/** What a schedule says, as saved. */
export interface ScheduleFields {
  name: string;
  frequency: ReportFrequency;
  groupBy: string;
  siteId: string | null;
  recipients: string[];
  timeZone: string;
  isActive: boolean;
  nextRunAt: Date;
}

/** Reads and writes a tenant's report schedules. The worker runs them. */
@Injectable()
export class ReportSchedulesRepository {
  static readonly COLUMNS = {
    id: reportSchedules.id,
    name: reportSchedules.name,
    frequency: reportSchedules.frequency,
    groupBy: reportSchedules.groupBy,
    siteId: reportSchedules.siteId,
    siteName: sites.name,
    recipients: reportSchedules.recipients,
    timeZone: reportSchedules.timeZone,
    isActive: reportSchedules.isActive,
    nextRunAt: reportSchedules.nextRunAt,
    lastRunAt: reportSchedules.lastRunAt,
    version: reportSchedules.version,
  };

  async findAll(tx: Transaction): Promise<ReportScheduleRecord[]> {
    return this.select(tx).orderBy(asc(reportSchedules.name), asc(reportSchedules.id));
  }

  async findById(tx: Transaction, id: string): Promise<ReportScheduleRecord | null> {
    const [row] = await this.select(tx).where(eq(reportSchedules.id, id));
    return row ?? null;
  }

  async insert(
    tx: Transaction,
    tenantId: string,
    fields: ScheduleFields,
    by: string,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(reportSchedules).values({ id, tenantId, ...fields, createdBy: by });
    return id;
  }

  /** False when the version did not match. */
  async update(
    tx: Transaction,
    id: string,
    fields: ScheduleFields,
    version: number,
  ): Promise<boolean> {
    const rows = await tx
      .update(reportSchedules)
      .set({ ...fields, version: sql`${reportSchedules.version} + 1`, updatedAt: new Date() })
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.version, version)))
      .returning({ id: reportSchedules.id });
    return rows.length === 1;
  }

  async delete(tx: Transaction, id: string): Promise<void> {
    await tx.delete(reportSchedules).where(eq(reportSchedules.id, id));
  }

  private select(tx: Transaction) {
    return tx
      .select(ReportSchedulesRepository.COLUMNS)
      .from(reportSchedules)
      .leftJoin(sites, eq(sites.id, reportSchedules.siteId))
      .$dynamic();
  }
}
