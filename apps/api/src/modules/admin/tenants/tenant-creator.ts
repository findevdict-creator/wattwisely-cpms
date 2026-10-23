import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { RequestAuth } from '../../../common/request/request-auth';
import { CatalogErrors } from '../../plans/catalog-errors';
import { PlansService } from '../../plans/plans.service';
import { SubscriptionsRepository } from '../../subscription/subscriptions.repository';
import { AdminTenantsRepository } from './admin-tenants.repository';
import { CreateTenantRequestDto } from './dto/create-tenant-request.dto';
import { TenantSlug } from './tenant-slug';

/** Saves a new tenant and its plan inside one transaction (story ADM-01). */
@Injectable()
export class TenantCreator {
  constructor(
    private readonly tenants: AdminTenantsRepository,
    private readonly subscriptions: SubscriptionsRepository,
    private readonly plans: PlansService,
    private readonly audit: AuditRecorder,
  ) {}

  /** The new tenant's id. The slug's uniqueness is checked by the database (see the service). */
  async save(tx: Transaction, auth: RequestAuth, body: CreateTenantRequestDto): Promise<string> {
    const plan = await this.plans.require(tx, body.plan_id);
    if (!plan.isActive) {
      throw CatalogErrors.planInactive();
    }
    const row = TenantCreator.tenantRow(body);
    await this.tenants.insert(tx, row);
    await this.subscriptions.insert(tx, row.id, {
      planId: plan.id,
      status: body.subscription_status ?? 'active',
      trialEndsAt: TenantCreator.trialEnd(body),
      billingEmail: body.billing_email ?? null,
      billingName: body.billing_name ?? null,
      updatedBy: auth.requireAccount().id,
    });
    await this.audit.record(
      tx,
      auth,
      {
        action: 'admin.tenant_created',
        targetType: 'tenant',
        targetId: row.id,
        targetLabel: row.slug,
        after: { name: row.name, slug: row.slug, plan: plan.code, region: row.region },
      },
      row.id,
    );
    return row.id;
  }

  private static tenantRow(body: CreateTenantRequestDto) {
    return {
      id: UuidV7.create(),
      name: body.name.trim(),
      slug: body.slug ?? TenantSlug.fromName(body.name),
      status: 'active' as const,
      region: body.region ?? null,
      paymentMode: body.payment_mode ?? 'direct',
    };
  }

  private static trialEnd(body: CreateTenantRequestDto): Date | null {
    return body.subscription_status === 'trialing' && body.trial_ends_at
      ? new Date(body.trial_ends_at)
      : null;
  }
}
