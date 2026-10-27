/** How far the company's Stripe account has come. */
export type PaymentAccountStatus = 'not_connected' | 'pending' | 'active' | 'restricted';

/** GET /v1/payment-account: the company's connected account, or that there is none yet. */
export interface PaymentAccount {
  status: PaymentAccountStatus;
  is_provider_enabled: boolean;
  provider: string | null;
  provider_account_id: string | null;
  is_charges_enabled: boolean;
  is_payouts_enabled: boolean;
  is_details_submitted: boolean;
  requirements_due: string[];
  disabled_reason: string | null;
  country: string | null;
  default_currency: string | null;
  /** Held on a guest's card at the start, minor units. */
  hold_amount: number | null;
  /** Held on the saved card of one of the company's own drivers (module 19), minor units. */
  member_hold_amount: number | null;
  last_synced_at: string | null;
  connected_at: string | null;
  version: number | null;
}

export type PaymentStatus =
  | 'pending'
  | 'authorised'
  | 'captured'
  | 'released'
  | 'failed'
  | 'capture_failed'
  | 'partially_refunded'
  | 'refunded';

export type RefundStatus = 'awaiting_approval' | 'pending' | 'succeeded' | 'failed' | 'cancelled';

/** A refund of part or all of a captured payment. Amounts are minor units of `currency`. */
export interface Refund {
  id: string;
  payment_id: string;
  session_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  requested_by: string | null;
  requested_by_label: string | null;
  approved_by: string | null;
  approved_by_label: string | null;
  provider_refund_id: string | null;
  failure_message: string | null;
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
  version: number;
}

/** GET /v1/payments: one card payment and where its session happened. */
export interface Payment {
  id: string;
  session_id: string;
  type: 'preauth' | 'prepay' | 'postpay';
  status: PaymentStatus;
  currency: string;
  hold_amount: number;
  authorized_amount: number | null;
  captured_amount: number | null;
  refunded_amount: number;
  provider: string;
  provider_payment_id: string;
  card_brand: string | null;
  card_last4: string | null;
  failure_code: string | null;
  failure_message: string | null;
  review_flags: string[];
  site_id: string;
  site_name: string;
  charger_id: string;
  charger_identity: string;
  connector_label: string;
  session_status: string;
  session_gross_amount: number | null;
  energy_wh: number;
  authorized_at: string | null;
  captured_at: string | null;
  released_at: string | null;
  failed_at: string | null;
  created_at: string;
  version: number;
}

/** GET /v1/payments/{id}: the payment with its refunds, newest first. */
export interface PaymentDetail extends Payment {
  refunds: Refund[];
}

export interface PaymentPage {
  items: Payment[];
  next_cursor: string | null;
}

/** The filters of the payments list. */
export interface PaymentFilter {
  site_id?: string;
  session_id?: string;
  status?: string;
}

/** The card payment as a session page shows it. */
export interface SessionPayment {
  id: string;
  status: PaymentStatus;
  currency: string;
  hold_amount: number;
  authorized_amount: number | null;
  captured_amount: number | null;
  refunded_amount: number;
  provider: string;
  provider_payment_id: string;
  card_brand: string | null;
  card_last4: string | null;
  failure_message: string | null;
  review_flags: string[];
  authorized_at: string | null;
  captured_at: string | null;
  released_at: string | null;
  failed_at: string | null;
  refunds: Refund[];
}
