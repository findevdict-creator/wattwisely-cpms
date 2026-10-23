import { Injectable } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import { DatabaseSession, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { ReportFileBuilder } from '@wattwisely/reports';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ReportErrors } from '../report-errors';
import { CreateReportExportRequestDto } from './dto/create-report-export-request.dto';
import { ReportExportListDto } from './dto/report-export-list.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ExportParametersBuilder } from './export-parameters.builder';
import { ReportExportsRepository } from './report-exports.repository';

/**
 * Background exports (story SES-04): queued here, built by the worker (up to 100,000 rows,
 * kept 7 days), downloaded by the member who asked. Each member has at most 3 waiting.
 */
@Injectable()
export class ReportExportsService {
  static readonly MAX_WAITING = 3;
  static readonly LIST_SIZE = 50;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly exports: ReportExportsRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async create(auth: RequestAuth, request: CreateReportExportRequestDto): Promise<ReportExportDto> {
    const access = auth.requireAccess();
    const entry = {
      tenantId: access.tenant.id,
      kind: request.kind,
      parameters: ExportParametersBuilder.build(access, request),
      fileName: ReportFileBuilder.fileName(request.kind, request.from, request.to, new Date()),
      requestedBy: auth.requireAccount().id,
      membershipId: access.membershipId,
    };
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const waiting = await this.exports.countWaiting(tx, access.membershipId);
      if (waiting >= ReportExportsService.MAX_WAITING) {
        throw ReportErrors.tooManyExports(ReportExportsService.MAX_WAITING);
      }
      const created = await this.exports.insert(tx, entry);
      await this.audit.record(tx, auth, {
        action: 'reports.export_requested',
        targetType: 'report_export',
        targetId: created.id,
        targetLabel: entry.fileName,
        after: { kind: entry.kind, parameters: entry.parameters },
      });
      return new ReportExportDto(created);
    });
  }

  async list(access: TenantAccess): Promise<ReportExportListDto> {
    const rows = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.exports.findMine(tx, access.membershipId, ReportExportsService.LIST_SIZE),
    );
    return new ReportExportListDto(rows.map((row) => new ReportExportDto(row)));
  }

  /** The CSV of a ready export of the caller's, unpacked. */
  async download(access: TenantAccess, id: string): Promise<{ fileName: string; csv: Buffer }> {
    const found = UuidV7.isUuid(id)
      ? await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
          this.exports.findOne(tx, access.membershipId, id),
        )
      : null;
    if (!found) {
      throw ReportErrors.exportNotFound();
    }
    if (found.status !== 'ready' || !found.data) {
      throw ReportErrors.exportNotReady(found.status);
    }
    return { fileName: found.fileName, csv: gunzipSync(found.data) };
  }
}
