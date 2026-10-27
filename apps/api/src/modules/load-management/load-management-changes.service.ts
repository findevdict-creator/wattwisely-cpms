import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { LoadManagementDto } from './dto/load-management.dto';
import { UpdateLoadManagementRequestDto } from './dto/update-load-management-request.dto';
import { LoadManagementErrors } from './load-management-errors';
import { LoadPolicyRecord } from './load-management-record';
import { LoadManagementRepository } from './load-management.repository';
import { LoadManagementService } from './load-management.service';

/**
 * Saving a site's load policy and its chargers' priorities (module 17). The worker picks the
 * change up on its next round; nothing is sent to a charger from here. Every save lands in the
 * audit log with the policy before and after.
 */
@Injectable()
export class LoadManagementChangesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: LoadManagementRepository,
    private readonly reader: LoadManagementService,
    private readonly audit: AuditRecorder,
  ) {}

  async update(
    auth: RequestAuth,
    siteId: string,
    version: number,
    request: UpdateLoadManagementRequestDto,
  ): Promise<LoadManagementDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireAt(access, 'load_management:write', siteId);
    if (request.min_power_kw > request.limit_kw) {
      throw LoadManagementErrors.minimumAboveLimit();
    }
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const siteName = await this.reader.requireSiteName(tx, siteId);
      const before = await this.reader.requirePolicy(tx, siteId);
      await this.savePolicy(tx, auth, siteId, { version, request });
      await this.saveChargers(tx, access.tenant.id, siteId, request);
      const after = (await this.repository.policy(tx, siteId)) as LoadPolicyRecord;
      await this.record(tx, auth, { id: siteId, name: siteName }, { before, after });
      return new LoadManagementDto(after, await this.repository.chargers(tx, siteId));
    });
  }

  private async savePolicy(
    tx: Transaction,
    auth: RequestAuth,
    siteId: string,
    change: { version: number; request: UpdateLoadManagementRequestDto },
  ): Promise<void> {
    const access = auth.requireAccess();
    const isSaved = await this.repository.savePolicy(
      tx,
      {
        tenantId: access.tenant.id,
        siteId,
        accountId: auth.requireAccount().id,
        id: UuidV7.create(),
      },
      {
        isEnabled: change.request.is_enabled,
        limitKw: change.request.limit_kw,
        strategy: change.request.strategy,
        minPowerKw: change.request.min_power_kw,
      },
      change.version,
    );
    if (!isSaved) {
      throw VersionConflict.exception();
    }
  }

  private async saveChargers(
    tx: Transaction,
    tenantId: string,
    siteId: string,
    request: UpdateLoadManagementRequestDto,
  ): Promise<void> {
    const atSite = new Set(
      (await this.repository.chargers(tx, siteId)).map((charger) => charger.id),
    );
    for (const setting of request.chargers) {
      if (!atSite.has(setting.charger_id)) {
        throw LoadManagementErrors.chargerNotAtSite(setting.charger_id);
      }
      await this.repository.saveChargerSettings(tx, tenantId, {
        chargerId: setting.charger_id,
        priority: setting.priority,
        maxPowerKw: setting.max_power_kw ?? null,
      });
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    site: { id: string; name: string },
    change: { before: LoadPolicyRecord; after: LoadPolicyRecord },
  ): Promise<void> {
    const snapshot = (policy: LoadPolicyRecord) => ({
      is_enabled: policy.isEnabled,
      limit_kw: policy.limitKw,
      strategy: policy.strategy,
      min_power_kw: policy.minPowerKw,
    });
    return this.audit.record(tx, auth, {
      action: 'load_management.updated',
      targetType: 'site',
      targetId: site.id,
      targetLabel: site.name,
      before: change.before.version === 0 ? null : snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
