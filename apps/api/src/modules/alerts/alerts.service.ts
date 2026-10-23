import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { PageRequest } from '../../common/paging/page-request';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { AlertErrors } from './alert-errors';
import { AlertRecord } from './alert-record';
import { AlertsRepository } from './alerts.repository';
import { AcknowledgeAlertRequestDto } from './dto/acknowledge-alert-request.dto';
import { AlertPageDto } from './dto/alert-page.dto';
import { AlertSummaryDto } from './dto/alert-summary.dto';
import { AlertDto } from './dto/alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';

/**
 * Alerts for staff (story NTF-04): the list at the sites where the caller holds
 * alerts:read, one alert, the badge counts, and acknowledging with a note. The worker
 * opens and closes alerts; people only acknowledge them.
 */
@Injectable()
export class AlertsService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly alerts: AlertsRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async list(access: TenantAccess, query: ListAlertsQueryDto): Promise<AlertPageDto> {
    const page = PageRequest.from(query);
    const filter = {
      scope: SitePermissionChecker.scopeOf(access, 'alerts:read'),
      status: query.status,
      type: query.type,
      siteId: query.site_id,
      chargerId: query.charger_id,
    };
    const rows = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.alerts.findPage(tx, filter, page.cursor, page.fetchSize),
    );
    const { items, nextCursor } = page.cut(rows, (alert) => alert.openedAt.toISOString());
    return new AlertPageDto(
      items.map((alert) => new AlertDto(alert)),
      nextCursor,
    );
  }

  async summary(access: TenantAccess): Promise<AlertSummaryDto> {
    const scope = SitePermissionChecker.scopeOf(access, 'alerts:read');
    const counts = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.alerts.countLive(tx, scope),
    );
    return new AlertSummaryDto(counts);
  }

  async get(access: TenantAccess, id: string): Promise<AlertDto> {
    return this.runner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => new AlertDto(await this.requireVisible(tx, access, id)),
    );
  }

  async acknowledge(
    auth: RequestAuth,
    id: string,
    request: AcknowledgeAlertRequestDto,
    version: number,
  ): Promise<AlertDto> {
    const access = auth.requireAccess();
    const account = auth.requireAccount();
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const alert = await this.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'alerts:acknowledge', alert.siteId);
      const note = request.note?.trim() ?? '';
      if (!(await this.alerts.acknowledge(tx, id, { accountId: account.id, note }, version))) {
        throw alert.status === 'open' ? VersionConflict.exception() : AlertErrors.notOpen();
      }
      await this.audit.record(tx, auth, {
        action: 'alerts.acknowledged',
        targetType: 'alert',
        targetId: id,
        targetLabel: alert.title,
        before: { status: alert.status },
        after: { status: 'acknowledged', note },
      });
      return new AlertDto(await this.requireVisible(tx, access, id));
    });
  }

  /** 404 for an alert that does not exist or is at a site the caller may not see. */
  private async requireVisible(
    tx: Transaction,
    access: TenantAccess,
    id: string,
  ): Promise<AlertRecord> {
    const alert = UuidV7.isUuid(id) ? await this.alerts.findById(tx, id) : null;
    if (!alert || !SitePermissionChecker.isAllowedAt(access, 'alerts:read', alert.siteId)) {
      throw AlertErrors.notFound();
    }
    return alert;
  }
}
