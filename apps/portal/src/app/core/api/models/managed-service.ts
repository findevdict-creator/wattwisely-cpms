/** The Wattwisely staff member a managed company can turn to. */
export interface AccountManager {
  staff_id: string;
  name: string;
  email: string;
}

/** A Wattwisely staff member working in the company as its Managed operator. */
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

/** GET /v1/managed-service: the agreement under which Wattwisely runs the company's charging. */
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

/** Body of POST /v1/managed-service/notice: when the service should end, and why. */
export interface ManagedNoticeRequest {
  ends_at?: string;
  reason?: string;
}
