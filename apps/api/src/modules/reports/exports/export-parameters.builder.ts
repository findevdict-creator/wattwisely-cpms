import { PermissionKey } from '../../../common/permissions/permission-catalog';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { SessionErrors } from '../../sessions/session-errors';
import { SessionStates } from '@wattwisely/session-engine';
import { ReportErrors } from '../report-errors';
import { ReportPeriod } from '../report-period';
import { CreateReportExportRequestDto } from './dto/create-report-export-request.dto';

/**
 * Turns an export request into the parameters the worker reads, with the caller's site
 * scope frozen in: the file holds what the caller could see when they asked.
 */
export class ExportParametersBuilder {
  static readonly PERMISSIONS: Record<CreateReportExportRequestDto['kind'], PermissionKey> = {
    sessions: 'sessions:export',
    usage: 'reports:read',
    audit_log: 'audit:read',
  };

  static build(
    access: TenantAccess,
    request: CreateReportExportRequestDto,
  ): Record<string, unknown> {
    const key = ExportParametersBuilder.PERMISSIONS[request.kind];
    const scope = access.permissions.scopeFor(key);
    if (!scope) {
      throw ReportErrors.permission(key);
    }
    if (request.kind === 'sessions') {
      return ExportParametersBuilder.sessions(request, scope.toSiteIds());
    }
    if (request.kind === 'usage') {
      return ExportParametersBuilder.usage(request, scope.toSiteIds());
    }
    return {
      action: request.action,
      targetType: request.target_type,
      from: request.from,
      to: request.to,
    };
  }

  private static sessions(request: CreateReportExportRequestDto, siteIds: string[] | null) {
    const statuses = request.status?.split(',');
    const unknown = statuses?.find((status) => !SessionStates.isState(status));
    if (unknown !== undefined) {
      throw SessionErrors.invalidStatus(unknown);
    }
    return {
      siteIds,
      siteId: request.site_id,
      chargerId: request.charger_id,
      statuses,
      from: request.from,
      to: request.to,
      isReviewNeeded: request.needs_review === 'true',
    };
  }

  private static usage(request: CreateReportExportRequestDto, siteIds: string[] | null) {
    const period = ReportPeriod.of(request.from ?? '', request.to ?? '');
    return {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      groupBy: request.group_by ?? 'site',
      siteIds,
      siteId: request.site_id,
    };
  }
}
