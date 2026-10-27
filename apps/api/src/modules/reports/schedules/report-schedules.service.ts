import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { ReportCalendar } from '@wattwisely/reports';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ReportErrors } from '../report-errors';
import { ReportScheduleListDto } from './dto/report-schedule-list.dto';
import { ReportScheduleRequestDto } from './dto/report-schedule-request.dto';
import { ReportScheduleDto } from './dto/report-schedule.dto';
import {
  ReportScheduleRecord,
  ReportSchedulesRepository,
  ScheduleFields,
} from './report-schedules.repository';

/**
 * Scheduled usage reports (PRD, Reports; the Full reports module of the Growth and
 * Enterprise plans): a usage CSV for the week or month just ended, e-mailed to the
 * recipients. Schedules report on the whole company, so they need reports:schedule and
 * reports:read for every site.
 */
@Injectable()
export class ReportSchedulesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly schedules: ReportSchedulesRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async list(access: TenantAccess): Promise<ReportScheduleListDto> {
    const rows = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.schedules.findAll(tx),
    );
    return new ReportScheduleListDto(rows.map((row) => new ReportScheduleDto(row)));
  }

  async create(auth: RequestAuth, request: ReportScheduleRequestDto): Promise<ReportScheduleDto> {
    const access = ReportSchedulesService.requireWholeTenant(auth);
    const fields = ReportSchedulesService.fields(request);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const id = await this.schedules.insert(
        tx,
        access.tenant.id,
        fields,
        auth.requireAccount().id,
      );
      const created = await this.require(tx, id);
      await this.record(tx, auth, created, { action: 'reports.schedule_created', after: request });
      return new ReportScheduleDto(created);
    });
  }

  async update(
    auth: RequestAuth,
    id: string,
    request: ReportScheduleRequestDto,
    version: number,
  ): Promise<ReportScheduleDto> {
    const access = ReportSchedulesService.requireWholeTenant(auth);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const before = await this.require(tx, id);
      if (!(await this.schedules.update(tx, id, ReportSchedulesService.fields(request), version))) {
        throw VersionConflict.exception();
      }
      const after = await this.require(tx, id);
      await this.record(tx, auth, after, {
        action: 'reports.schedule_updated',
        before: new ReportScheduleDto(before),
        after: request,
      });
      return new ReportScheduleDto(after);
    });
  }

  async remove(auth: RequestAuth, id: string): Promise<void> {
    const access = ReportSchedulesService.requireWholeTenant(auth);
    await this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const before = await this.require(tx, id);
      await this.schedules.delete(tx, id);
      await this.record(tx, auth, before, {
        action: 'reports.schedule_deleted',
        before: new ReportScheduleDto(before),
      });
    });
  }

  private async require(tx: Transaction, id: string): Promise<ReportScheduleRecord> {
    const found = UuidV7.isUuid(id) ? await this.schedules.findById(tx, id) : null;
    if (!found) {
      throw ReportErrors.scheduleNotFound();
    }
    return found;
  }

  private async record(
    tx: Transaction,
    auth: RequestAuth,
    schedule: ReportScheduleRecord,
    change: { action: string; before?: unknown; after?: unknown },
  ) {
    await this.audit.record(tx, auth, {
      targetType: 'report_schedule',
      targetId: schedule.id,
      targetLabel: schedule.name,
      ...change,
    });
  }

  private static requireWholeTenant(auth: RequestAuth): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'reports:schedule');
    SitePermissionChecker.requireWholeTenant(access, 'reports:read');
    return access;
  }

  private static fields(request: ReportScheduleRequestDto): ScheduleFields {
    return {
      name: request.name.trim(),
      frequency: request.frequency,
      groupBy: request.group_by ?? 'site',
      siteId: request.site_id ?? null,
      recipients: [...new Set(request.recipients.map((email) => email.trim().toLowerCase()))],
      timeZone: request.time_zone,
      isActive: request.is_active ?? true,
      nextRunAt: ReportCalendar.nextRun(request.frequency, request.time_zone, new Date()),
    };
  }
}
