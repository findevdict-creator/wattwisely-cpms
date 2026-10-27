import { and, asc, count, eq, gte, inArray, isNotNull, lt, or, sql, sum } from 'drizzle-orm';
import {
  addons,
  chargingSessions,
  managedServices,
  plans,
  platformTenantOverview,
  tenantEntitlements,
  tenantSubscriptions,
  Transaction,
} from '@wattwisely/db';
import { BillingPeriod } from '../period/billing-period';
import {
  AddonCharge,
  InvoiceInput,
  ManagedServiceCharge,
  PlanFees,
  RevenueTotal,
  SubscriptionTerms,
  UsageCounts,
} from '../invoice/invoice-input';

/** The tenant's plan row as the calculator and the invoice need it. */
export interface BillableSubscription {
  id: string;
  terms: SubscriptionTerms;
  plan: PlanFees;
}

/** A module's name for the line, from the API's ModuleCatalog. */
export type ModuleNameLookup = (key: string) => string;

/**
 * Reads what one tenant's invoice is made of (module 15). Runs with platform access inside
 * the tenant (the admin console or the worker), so it sees the global plan rows, the
 * tenant's size and its sessions at once.
 */
export class InvoiceInputLoader {
  static async load(
    tx: Transaction,
    tenantId: string,
    period: BillingPeriod,
    nameOf: ModuleNameLookup,
  ): Promise<{ subscription: BillableSubscription; input: InvoiceInput } | null> {
    const subscription = await InvoiceInputLoader.subscription(tx, tenantId);
    if (!subscription) {
      return null;
    }
    const input: InvoiceInput = {
      period,
      plan: subscription.plan,
      subscription: subscription.terms,
      usage: await InvoiceInputLoader.usage(tx, tenantId),
      addons: await InvoiceInputLoader.addons(tx, tenantId, nameOf),
      managedServices: await InvoiceInputLoader.managedServices(tx, tenantId, period),
      revenue: await InvoiceInputLoader.revenue(tx, tenantId, period),
    };
    return { subscription, input };
  }

  static async subscription(
    tx: Transaction,
    tenantId: string,
  ): Promise<BillableSubscription | null> {
    const rows = await tx
      .select({ subscription: tenantSubscriptions, plan: plans })
      .from(tenantSubscriptions)
      .innerJoin(plans, eq(plans.id, tenantSubscriptions.planId))
      .where(eq(tenantSubscriptions.tenantId, tenantId));
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.subscription.id,
      terms: InvoiceInputLoader.termsOf(row.subscription),
      plan: InvoiceInputLoader.feesOf(row.plan),
    };
  }

  private static termsOf(row: typeof tenantSubscriptions.$inferSelect): SubscriptionTerms {
    return {
      status: row.status,
      startedAt: row.startedAt,
      trialEndsAt: row.trialEndsAt,
      taxRateBps: row.taxRateBps,
      billingName: row.billingName,
      billingEmail: row.billingEmail,
      billingReference: row.billingReference,
    };
  }

  private static feesOf(row: typeof plans.$inferSelect): PlanFees {
    return {
      code: row.code,
      name: row.name,
      currency: row.currency,
      platformFee: row.platformFee,
      acConnectorFee: row.acConnectorFee,
      dcConnectorFee: row.dcConnectorFee,
      revenueShareBps: row.revenueShareBps,
    };
  }

  private static async usage(tx: Transaction, tenantId: string): Promise<UsageCounts> {
    const rows = await tx
      .select({
        acConnectors: platformTenantOverview.acConnectorCount,
        dcConnectors: platformTenantOverview.dcConnectorCount,
        sites: platformTenantOverview.siteCount,
      })
      .from(platformTenantOverview)
      .where(eq(platformTenantOverview.tenantId, tenantId));
    return rows[0] ?? { acConnectors: 0, dcConnectors: 0, sites: 0 };
  }

  /** The add-ons the tenant bought (not trials or overrides), with today's prices. */
  private static async addons(
    tx: Transaction,
    tenantId: string,
    nameOf: ModuleNameLookup,
  ): Promise<AddonCharge[]> {
    const rows = await tx
      .select({
        key: tenantEntitlements.featureKey,
        from: tenantEntitlements.createdAt,
        to: tenantEntitlements.endsAt,
        currency: addons.currency,
        price: addons.price,
        pricingUnit: addons.pricingUnit,
      })
      .from(tenantEntitlements)
      .innerJoin(addons, eq(addons.key, tenantEntitlements.featureKey))
      .where(
        and(
          eq(tenantEntitlements.tenantId, tenantId),
          eq(tenantEntitlements.source, 'addon'),
          eq(tenantEntitlements.isEnabled, true),
        ),
      )
      .orderBy(asc(addons.sortOrder));
    return rows.map((row) => ({ ...row, name: nameOf(row.key) }));
  }

  /** Agreements accepted before the month ended and not over before it began. */
  private static async managedServices(
    tx: Transaction,
    tenantId: string,
    period: BillingPeriod,
  ): Promise<ManagedServiceCharge[]> {
    const end = sql`coalesce(${managedServices.endedAt}, ${managedServices.endsAt})`;
    const rows = await tx
      .select({
        reference: managedServices.agreementReference,
        monthlyFee: managedServices.monthlyFee,
        from: managedServices.acceptedAt,
        to: sql<Date | null>`${end}`.mapWith((value) => (value ? new Date(value) : null)),
      })
      .from(managedServices)
      .where(
        and(
          eq(managedServices.tenantId, tenantId),
          inArray(managedServices.status, ['active', 'ending', 'ended']),
          isNotNull(managedServices.acceptedAt),
          lt(managedServices.acceptedAt, period.to),
          or(sql`${end} is null`, sql`${end} > ${period.from}`),
        ),
      )
      .orderBy(asc(managedServices.acceptedAt));
    return rows.map((row) => ({ ...row, from: row.from as Date }));
  }

  /** Completed sessions that started in the month, by currency. */
  private static async revenue(
    tx: Transaction,
    tenantId: string,
    period: BillingPeriod,
  ): Promise<RevenueTotal[]> {
    const rows = await tx
      .select({
        currency: chargingSessions.currency,
        gross: sum(chargingSessions.grossAmount).mapWith(Number),
        sessions: count(),
      })
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.tenantId, tenantId),
          eq(chargingSessions.status, 'completed'),
          isNotNull(chargingSessions.currency),
          gte(chargingSessions.startedAt, period.from),
          lt(chargingSessions.startedAt, period.to),
        ),
      )
      .groupBy(chargingSessions.currency);
    return rows.map((row) => ({
      currency: row.currency as string,
      gross: row.gross || 0,
      sessions: row.sessions,
    }));
  }
}
