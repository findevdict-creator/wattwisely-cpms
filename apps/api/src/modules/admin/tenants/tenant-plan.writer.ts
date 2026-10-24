import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { ModuleCatalog } from '../../../common/permissions/module-catalog';
import { PlansService } from '../../plans/plans.service';
import {
  SubscriptionRecord,
  SubscriptionsRepository,
} from '../../subscription/subscriptions.repository';
import { AdminTenantErrors } from './admin-tenant-errors';
import { SetModuleRequestDto } from './dto/set-module-request.dto';
import { SetSubscriptionRequestDto } from './dto/set-subscription-request.dto';
import { TenantEntitlementsWriter } from './tenant-entitlements.writer';

/** The current tenant_subscriptions row, when there is one. */
type SubscriptionRow = SubscriptionRecord['subscription'];

/** The database side of changing a tenant's plan and modules, inside the caller's transaction. */
@Injectable()
export class TenantPlanWriter {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly entitlements: TenantEntitlementsWriter,
    private readonly plans: PlansService,
  ) {}

  /** Creates or replaces the tenant's plan row. Returns what the log should remember. */
  async setSubscription(
    tx: Transaction,
    auth: RequestAuth,
    tenantId: string,
    body: SetSubscriptionRequestDto,
  ): Promise<{ before: object | null; after: object }> {
    const plan = await this.plans.require(tx, body.plan_id);
    const existing = await this.subscriptions.findByTenant(tx, tenantId);
    const changes = {
      ...TenantPlanWriter.columns(body, existing?.subscription),
      planId: plan.id,
      updatedBy: auth.requireAccount().id,
    };
    if (existing) {
      const { id, version } = existing.subscription;
      await this.subscriptions.update(tx, id, version, changes);
    } else {
      await this.subscriptions.insert(tx, tenantId, changes);
    }
    const before = existing
      ? { plan: existing.plan.code, status: existing.subscription.status }
      : null;
    return { before, after: { plan: plan.code, status: changes.status } };
  }

  /** The request's fields; a billing field left out keeps its current value. */
  private static columns(body: SetSubscriptionRequestDto, current?: SubscriptionRow) {
    const status = body.status ?? 'active';
    const trialEnd = status === 'trialing' ? body.trial_ends_at : null;
    return {
      status,
      trialEndsAt: trialEnd ? new Date(trialEnd) : null,
      ...TenantPlanWriter.billing(body, current),
      notes: TenantPlanWriter.keep(body.notes, current?.notes) ?? '',
    };
  }

  /** The billing contact and the tax rate on invoices (module 15); left out keeps the current. */
  private static billing(body: SetSubscriptionRequestDto, current?: SubscriptionRow) {
    return {
      billingEmail: TenantPlanWriter.keep(body.billing_email, current?.billingEmail),
      billingName: TenantPlanWriter.keep(body.billing_name, current?.billingName),
      billingReference: TenantPlanWriter.keep(body.billing_reference, current?.billingReference),
      taxRateBps: TenantPlanWriter.keep(body.tax_rate_bps, current?.taxRateBps) ?? 0,
    };
  }

  private static keep<T>(sent: T | undefined, current: T | undefined): T | null {
    return sent === undefined ? (current ?? null) : sent;
  }

  /** Switches one gated module on or off for the tenant. */
  async setModule(
    tx: Transaction,
    auth: RequestAuth,
    tenantId: string,
    module: { key: string; body: SetModuleRequestDto },
  ): Promise<void> {
    TenantPlanWriter.requireGated(module.key);
    await this.entitlements.upsert(tx, tenantId, module.key, {
      source: module.body.source,
      isEnabled: module.body.is_enabled ?? true,
      endsAt: module.body.ends_at ? new Date(module.body.ends_at) : null,
      note: module.body.note ?? '',
      grantedBy: auth.requireAccount().id,
    });
  }

  /** Returns the module to what the plan says. True when there was something to remove. */
  removeModule(tx: Transaction, tenantId: string, key: string): Promise<boolean> {
    TenantPlanWriter.requireGated(key);
    return this.entitlements.delete(tx, tenantId, key);
  }

  private static requireGated(key: string): void {
    if (!ModuleCatalog.gated().some((module) => module.key === key)) {
      throw AdminTenantErrors.moduleNotGated(key);
    }
  }
}
