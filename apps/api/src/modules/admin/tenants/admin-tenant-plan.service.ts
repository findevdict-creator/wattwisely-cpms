import { Injectable } from '@nestjs/common';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { SubscriptionDto } from '../../subscription/dto/subscription.dto';
import { AdminTenantDescriber } from './admin-tenant.describer';
import { SetModuleRequestDto } from './dto/set-module-request.dto';
import { SetSubscriptionRequestDto } from './dto/set-subscription-request.dto';
import { TenantPlanWriter } from './tenant-plan.writer';

/**
 * A tenant's plan and modules, set by Wattwisely staff (stories ADM-01, ADM-03). Every change
 * is written to the tenant's own audit log, so its Owners can see who switched what, and
 * reaches the tenant's members on their next request.
 */
@Injectable()
export class AdminTenantPlanService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly writer: TenantPlanWriter,
    private readonly audit: AuditRecorder,
    private readonly describer: AdminTenantDescriber,
  ) {}

  setSubscription(
    auth: RequestAuth,
    tenantId: string,
    body: SetSubscriptionRequestDto,
  ): Promise<SubscriptionDto> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      const { tenant } = await this.describer.requireLive(tx, tenantId);
      const change = await this.writer.setSubscription(tx, auth, tenantId, body);
      await this.audit.record(
        tx,
        auth,
        {
          action: 'admin.plan_changed',
          targetType: 'tenant',
          targetId: tenantId,
          targetLabel: tenant.slug,
          before: change.before,
          after: change.after,
        },
        tenantId,
      );
      return this.describer.subscription(tx, tenantId);
    });
  }

  setModule(
    auth: RequestAuth,
    tenantId: string,
    key: string,
    body: SetModuleRequestDto,
  ): Promise<SubscriptionDto> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      const { tenant } = await this.describer.requireLive(tx, tenantId);
      await this.writer.setModule(tx, auth, tenantId, { key, body });
      await this.audit.record(
        tx,
        auth,
        {
          action: 'admin.module_changed',
          targetType: 'module',
          targetId: key,
          targetLabel: tenant.slug,
          after: { source: body.source, isEnabled: body.is_enabled ?? true, endsAt: body.ends_at },
        },
        tenantId,
      );
      return this.describer.subscription(tx, tenantId);
    });
  }

  removeModule(auth: RequestAuth, tenantId: string, key: string): Promise<SubscriptionDto> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      const { tenant } = await this.describer.requireLive(tx, tenantId);
      if (await this.writer.removeModule(tx, tenantId, key)) {
        await this.audit.record(
          tx,
          auth,
          {
            action: 'admin.module_reset',
            targetType: 'module',
            targetId: key,
            targetLabel: tenant.slug,
          },
          tenantId,
        );
      }
      return this.describer.subscription(tx, tenantId);
    });
  }
}
