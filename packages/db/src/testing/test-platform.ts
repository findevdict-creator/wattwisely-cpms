import { UuidV7 } from '../client/uuid-v7';
import { TestData, TestPerson } from './test-data';

/** What else a test subscription can say. */
export interface SubscriptionOptions {
  startedAt?: Date;
  trialEndsAt?: Date;
  taxRateBps?: number;
  billingEmail?: string;
  billingName?: string;
}

/**
 * The admin console's rows for tests (module 9): Wattwisely staff, each tenant's plan and
 * the modules it has beyond the plan. Plans and add-ons themselves come from migration 0014.
 */
export class TestPlatform {
  static readonly PLAN_IDS = {
    flex: '00000000-0000-7000-8000-000000000101',
    starter: '00000000-0000-7000-8000-000000000102',
    growth: '00000000-0000-7000-8000-000000000103',
    enterprise: '00000000-0000-7000-8000-000000000104',
  };

  constructor(private readonly data: TestData) {}

  /** Makes the person Wattwisely staff with the given console role. */
  async staff(person: TestPerson, role = 'admin'): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      'insert into platform_staff (id, user_account_id, role) values ($1, $2, $3)',
      [id, person.accountId, role],
    );
    return id;
  }

  /** Puts the tenant on a plan; since now unless `startedAt` says otherwise (module 15 bills from then). */
  async subscription(
    tenantId: string,
    planId: string,
    status = 'active',
    options: SubscriptionOptions = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into tenant_subscriptions (id, tenant_id, plan_id, status, started_at, trial_ends_at,
         tax_rate_bps, billing_email, billing_name)
       values ($1, $2, $3, $4, coalesce($5, now()), $6, $7, $8, $9)`,
      [
        id,
        tenantId,
        planId,
        status,
        options.startedAt ?? null,
        options.trialEndsAt ?? null,
        options.taxRateBps ?? 0,
        options.billingEmail ?? null,
        options.billingName ?? null,
      ],
    );
    return id;
  }

  /** Gives (or, with isEnabled false, takes from) the tenant one module beyond its plan. */
  async entitlement(
    tenantId: string,
    featureKey: string,
    source = 'addon',
    isEnabled = true,
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into tenant_entitlements (id, tenant_id, feature_key, source, is_enabled)
       values ($1, $2, $3, $4, $5)`,
      [id, tenantId, featureKey, source, isEnabled],
    );
    return id;
  }
}
