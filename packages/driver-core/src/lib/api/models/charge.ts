import { PublicBranding } from './branding';

export type SessionStatus =
  | 'authorising'
  | 'starting'
  | 'charging'
  | 'suspended'
  | 'idle'
  | 'stopping'
  | 'completed'
  | 'not_started'
  | 'failed';

export type PaymentStatus =
  | 'pending'
  | 'authorised'
  | 'captured'
  | 'released'
  | 'failed'
  | 'capture_failed'
  | 'partially_refunded'
  | 'refunded';

/** One line of the receipt. Amounts are minor units. */
export interface ReceiptLine {
  kind: 'start_fee' | 'energy' | 'time' | 'idle' | 'adjustment';
  band_name: string | null;
  from: string | null;
  to: string | null;
  quantity: number;
  unit: 'wh' | 'min' | 'session';
  unit_price: string | null;
  net: number;
  tax: number;
  gross: number;
}

export interface ChargeReceipt {
  lines: ReceiptLine[];
  net: number | null;
  tax: number | null;
  gross: number | null;
  priced_at: string;
}

/** A paid charge as /v1/public/charges/{key} follows it. Amounts are minor units of `currency`. */
export interface Charge {
  charge_key: string;
  session_id: string;
  session_status: SessionStatus;
  payment_status: PaymentStatus;
  operator_name: string;
  site_name: string;
  charger_identity: string;
  connector_label: string;
  time_zone: string;
  started_at: string;
  ended_at: string | null;
  currency: string;
  hold_amount: number;
  /** The cost so far, or the amount taken at the end. */
  amount: number | null;
  energy_wh: number;
  card_brand: string | null;
  card_last4: string | null;
  failure_message: string | null;
  failure_reason: string | null;
  can_stop: boolean;
  is_stop_requested: boolean;
  receipt: ChargeReceipt | null;
  /** For the card form, while the hold waits. */
  client_secret: string | null;
  publishable_key: string | null;
  provider_account_id: string;
  branding: PublicBranding;
}
