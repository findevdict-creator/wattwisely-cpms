/** The driver's own account, GET /v1/driver/me (module 19). */
export interface DriverMe {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
}

export type DriverPaymentMode = 'inherit' | 'pay' | 'free';

/** An operator the driver is linked with, as GET /v1/driver/operators lists them. */
export interface DriverOperator {
  tenant_id: string;
  operator_name: string;
  operator_slug: string;
  /** The name the operator keeps for the driver. */
  driver_name: string;
  reference: string;
  status: 'active' | 'blocked';
  payment_mode: DriverPaymentMode;
  linked_at: string | null;
}

export interface DriverOperatorCard {
  id_tag: string;
  label: string;
  status: 'active' | 'blocked' | 'lost';
}

/** What one operator holds about the driver: the consent screen. */
export interface DriverOperatorProfile extends DriverOperator {
  email: string | null;
  phone: string | null;
  groups: string[];
  cards: DriverOperatorCard[];
}

/** An invitation as its link shows it, before anyone logs in. */
export interface DriverInvitationPreview {
  operator_name: string;
  driver_name: string;
  email: string;
  invited_by: string | null;
  expires_at: string;
  is_expired: boolean;
}
