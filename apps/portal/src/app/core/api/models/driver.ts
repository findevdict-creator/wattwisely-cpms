/** A driver is active, or blocked so none of their cards may charge. */
export type DriverStatus = 'active' | 'blocked';

/** A card is active, blocked by staff, or reported lost. */
export type RfidCardStatus = 'active' | 'blocked' | 'lost';

/**
 * Whether a session is paid (module 19): `pay` always, `free` never, `inherit` asks the next
 * level up (card → driver → groups → the operator, who always says pay).
 */
export type DriverPaymentMode = 'inherit' | 'pay' | 'free';

/** The driver's own login as the operator sees it (module 19, story DRV-04). */
export interface DriverAccountLink {
  status: 'none' | 'invited' | 'linked';
  /** The address invited, or the login's; null without drivers:read_personal. */
  email: string | null;
  invited_at: string | null;
  invitation_expires_at: string | null;
  is_invitation_expired: boolean;
  linked_at: string | null;
}

/** A group a driver belongs to, or a site a group opens. */
export interface NamedRow {
  id: string;
  name: string;
}

/** One RFID card from GET /v1/drivers/{id} (story DRV-03). */
export interface RfidCard {
  id: string;
  driver_id: string;
  id_tag: string;
  label: string;
  status: RfidCardStatus;
  payment_mode: DriverPaymentMode;
  expires_at: string | null;
  last_used_at: string | null;
  version: number;
  created_at: string;
}

/** A driver from GET /v1/drivers (story DRV-01). E-mail and phone are null without drivers:read_personal. */
export interface Driver {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reference: string;
  notes: string;
  status: DriverStatus;
  blocked_at: string | null;
  blocked_by: string | null;
  block_reason: string;
  card_count: number;
  active_card_count: number;
  last_session_at: string | null;
  groups: NamedRow[];
  payment_mode: DriverPaymentMode;
  account: DriverAccountLink;
  is_personal_data_hidden: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

/** GET /v1/drivers/{id}: the driver with their cards. */
export interface DriverDetail extends Driver {
  cards: RfidCard[];
}

/** One page of GET /v1/drivers, by name. */
export interface DriverPage {
  items: Driver[];
  next_cursor: string | null;
}

/** Body of POST /v1/drivers; PATCH sends any subset (null clears e-mail or phone). */
export interface DriverInput {
  name: string;
  email: string | null;
  phone: string | null;
  reference: string;
  notes: string;
  group_ids: string[];
  payment_mode: DriverPaymentMode;
}

/** Body of POST /v1/drivers/{id}/cards. */
export interface CardInput {
  id_tag: string;
  label: string;
  expires_at: string | null;
  payment_mode: DriverPaymentMode;
}

/** An access group from GET /v1/access-groups (story AST-04). */
export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  sites: NamedRow[];
  members: NamedRow[];
  payment_mode: DriverPaymentMode;
  /** Held on a member's card at the start instead of the operator's standard hold; minor units. */
  hold_amount: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Body of POST and PATCH /v1/access-groups: a list sent replaces the old one. */
export interface AccessGroupInput {
  name: string;
  description: string;
  site_ids: string[];
  driver_ids: string[];
  payment_mode: DriverPaymentMode;
  hold_amount: number | null;
}
