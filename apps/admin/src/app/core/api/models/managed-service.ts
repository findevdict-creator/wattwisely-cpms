/** The Wattwisely staff member a managed tenant turns to. */
export interface AccountManager {
  staff_id: string;
  name: string;
  email: string;
}

/** A Wattwisely staff member working in a tenant as its Managed operator. */
export interface ManagedOperator {
  id: string;
  staff_id: string | null;
  user_account_id: string;
  member_id: string;
  email: string;
  name: string;
  assigned_at: string;
}

export type ManagedServiceStatus =
  'pending_acceptance' | 'active' | 'ending' | 'ended' | 'withdrawn';

/** GET /v1/admin/tenants/{id}/managed-service: the latest agreement, with staff notes. */
export interface ManagedService {
  id: string;
  tenant_id: string;
  status: ManagedServiceStatus;
  account_manager: AccountManager | null;
  is_tariff_approval_required: boolean;
  /** The monthly fee in minor units of the plan currency; 0 for none. */
  monthly_fee: number;
  agreement_reference: string;
  notes: string | null;
  offered_at: string;
  accepted_at: string | null;
  notice_given_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  operators: ManagedOperator[];
  version: number;
}

/** Body of POST (offer) and PATCH (update) of the agreement. */
export interface ManagedServiceTerms {
  account_manager_id: string;
  is_tariff_approval_required: boolean;
  monthly_fee: number;
  agreement_reference: string;
  notes: string;
}

/** Body of POST .../managed-service/notice. */
export interface ManagedNoticeRequest {
  ends_at?: string;
  reason?: string;
}

/** One charger's month in the service report. */
export interface ServiceReportCharger {
  charger_id: string;
  ocpp_identity: string;
  site_name: string;
  sessions: number;
  energy_kwh: string;
  revenue: number;
  boots: number;
  faults: number;
}

/** A tariff change in the month, from the tenant's audit log. */
export interface ServiceReportTariffChange {
  action: string;
  tariff_name: string | null;
  occurred_at: string;
  actor_label: string;
  is_by_wattwisely: boolean;
}

/** GET .../managed-service/report: the monthly service report of a managed tenant. */
export interface ServiceReport {
  month: string;
  tenant_id: string;
  generated_at: string;
  is_complete: boolean;
  currency: string | null;
  chargers: ServiceReportCharger[];
  totals: { sessions: number; energy_kwh: string; revenue: number; faults: number };
  refunds: { count: number; total: number };
  tariff_changes: ServiceReportTariffChange[];
  actions_by_wattwisely: number;
  limitations: string[];
}
