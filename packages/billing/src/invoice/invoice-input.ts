import { BillingPeriod } from '../period/billing-period';

/** What a plan charges, from the plans row. */
export interface PlanFees {
  code: string;
  name: string;
  currency: string;
  platformFee: number;
  acConnectorFee: number;
  dcConnectorFee: number;
  revenueShareBps: number;
}

/** The tenant's subscription, from tenant_subscriptions. */
export interface SubscriptionTerms {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  startedAt: Date;
  /** Only while trialing: the plan is billed from the day after. */
  trialEndsAt: Date | null;
  taxRateBps: number;
  billingName: string | null;
  billingEmail: string | null;
  billingReference: string | null;
}

/** The tenant's size, as counted when the invoice is drafted. */
export interface UsageCounts {
  acConnectors: number;
  dcConnectors: number;
  sites: number;
}

/** An add-on the tenant bought, with its price. */
export interface AddonCharge {
  key: string;
  name: string;
  currency: string;
  price: number;
  pricingUnit: 'per_connector' | 'per_site' | 'per_tenant';
  /** When it was switched on, and when it ends (null while it runs). */
  from: Date;
  to: Date | null;
}

/** A managed service agreement in force during the month, with its fee (module 10). */
export interface ManagedServiceCharge {
  reference: string;
  monthlyFee: number;
  /** Accepted, and ended (null while it runs). */
  from: Date;
  to: Date | null;
}

/** Charging revenue of the month in one currency: completed sessions that started in it. */
export interface RevenueTotal {
  currency: string;
  gross: number;
  sessions: number;
}

/** Everything the calculator needs for one tenant's month. */
export interface InvoiceInput {
  period: BillingPeriod;
  plan: PlanFees;
  subscription: SubscriptionTerms;
  usage: UsageCounts;
  addons: AddonCharge[];
  managedServices: ManagedServiceCharge[];
  revenue: RevenueTotal[];
}
