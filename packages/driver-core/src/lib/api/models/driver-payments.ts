import { ReceiptLine } from './charge';
import { Place } from './place';

/** A card saved to the driver's login (module 19). */
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

export interface PaymentMethods {
  items: PaymentMethod[];
  /** False when this installation takes no card payments at all. */
  is_provider_enabled: boolean;
}

/** What the provider's form needs to save a card, on the platform's own account. */
export interface CardSetup {
  setup_id: string;
  client_secret: string;
  publishable_key: string | null;
}

/** Who pays for a session and which level decided it. */
export interface PaymentRule {
  outcome: 'pay' | 'free';
  decided_by: 'card' | 'driver' | 'group' | 'operator' | 'staff' | 'guest';
  label: string | null;
  /** "Free: group Depot staff". */
  words: string;
}

export type DriverChargeRefusal =
  | 'driver_blocked'
  | 'private_site'
  | 'plug_unavailable'
  | 'no_tariff'
  | 'payments_not_accepted'
  | 'no_payment_method';

/** What stands between the logged-in driver and a plug. */
export interface DriverPlaceAccess {
  tenant_id: string;
  is_linked: boolean;
  is_guest_record: boolean;
  is_blocked: boolean;
  is_private_site: boolean;
  is_member: boolean;
  /** The operator has no record of this login: starting needs the driver's consent to make one. */
  needs_consent: boolean;
  payment: Omit<PaymentRule, 'words'> & { words: string; hold_amount: number | null };
  card: { brand: string; last4: string } | null;
  can_charge: boolean;
  reason: DriverChargeRefusal | null;
  reason_words: string | null;
}

/** GET /v1/driver/places/{identity}/{connector}: the public facts, and the driver's access. */
export interface DriverPlace extends Place {
  access: DriverPlaceAccess;
}

/** One of the driver's own charges, at any operator. Amounts are minor units of `currency`. */
export interface DriverCharge {
  id: string;
  tenant_id: string;
  operator_name: string;
  site_name: string;
  charger_identity: string;
  connector_label: string;
  ocpp_connector_id: number;
  status: string;
  time_zone: string;
  started_at: string;
  ended_at: string | null;
  energy_wh: number;
  currency: string | null;
  amount: number | null;
  is_paid: boolean;
  start_source: string | null;
  payment_rule: PaymentRule | null;
  payment: {
    status: string;
    hold_amount: number;
    card_brand: string | null;
    card_last4: string | null;
    failure_message: string | null;
  } | null;
  failure_reason: string | null;
}

/** One charge in full. */
export interface DriverChargeDetail extends DriverCharge {
  receipt: {
    lines: ReceiptLine[];
    gross: number | null;
    net: number | null;
    tax: number | null;
    priced_at: string;
  } | null;
  can_stop: boolean;
  is_stop_requested: boolean;
  charge_key: string | null;
}

/** One point of a charge's chart (module 32): energy since the start, power and battery when reported. */
export interface ChargeReading {
  at: string;
  energy_wh: number | null;
  power_w: number | null;
  soc_percent: number | null;
}
