import { pgEnum } from 'drizzle-orm/pg-core';

/** trial and active tenants work normally; suspended tenants are read-only; cancelled tenants are closed. */
export const tenantStatus = pgEnum('tenant_status', ['trial', 'active', 'suspended', 'cancelled']);

/** invited: e-mail sent, not accepted yet. active: can work in the tenant. removed: access ended. */
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'removed']);

/**
 * Who did something recorded in the audit log. platform: Wattwisely staff acting from the
 * admin console (module 9); support: staff inside a tenant under time-limited support access;
 * managed: Wattwisely staff working inside a managed tenant as its Managed operator (module 10).
 */
export const auditActorType = pgEnum('audit_actor_type', [
  'user',
  'api_key',
  'support',
  'system',
  'platform',
  'managed',
]);

/** public: any driver or guest may charge. private: only the tenant's own drivers (story AST-04). */
export const siteVisibility = pgEnum('site_visibility', ['public', 'private']);

/** How a charger proves who it is when it connects: an HTTP Basic password, or none (story AST-02). */
export const chargerAuthMode = pgEnum('charger_auth_mode', ['password', 'none']);

/** The OCPP version a charger speaks. Set by the OCPP gateway when the charger connects. */
export const ocppVersion = pgEnum('ocpp_version', ['1.6', '2.0.1']);

/** The answer the gateway gave to the charger's last BootNotification. */
export const chargerRegistrationStatus = pgEnum('charger_registration_status', [
  'accepted',
  'pending',
  'rejected',
]);

/** The plug on a connector (story AST-03). "unknown" until someone sets it. */
export const connectorType = pgEnum('connector_type', [
  'ccs1',
  'ccs2',
  'type1',
  'type2',
  'chademo',
  'gbt',
  'nacs',
  'unknown',
]);

export const currentType = pgEnum('current_type', ['ac', 'dc']);

/**
 * A connector's state as the charger last reported it: the OCPP 1.6 ChargePointStatus
 * values, plus "occupied" from OCPP 2.0.1 and "unknown" before the first report.
 */
export const connectorStatus = pgEnum('connector_status', [
  'available',
  'preparing',
  'charging',
  'suspended_ev',
  'suspended_evse',
  'finishing',
  'reserved',
  'occupied',
  'unavailable',
  'faulted',
  'unknown',
]);

/** What the platform can ask a charger to do (OCPP gateway design, "Commands"). */
export const chargerCommandAction = pgEnum('charger_command_action', [
  'remote_start',
  'remote_stop',
  'reset',
  'unlock',
  'change_availability',
]);

/**
 * A command's life: queued (waiting for the charger, at most five minutes while it is
 * offline), sent (waiting for its reply), then one of the end states.
 */
export const chargerCommandStatus = pgEnum('charger_command_status', [
  'queued',
  'sent',
  'accepted',
  'rejected',
  'timed_out',
  'expired',
  'failed',
]);

/** Which way an OCPP message travelled: in from the charger, out to it. */
export const ocppDirection = pgEnum('ocpp_direction', ['in', 'out']);

/** The three OCPP-J frame kinds: a CALL, its CALLRESULT or its CALLERROR. */
export const ocppMessageType = pgEnum('ocpp_message_type', ['call', 'call_result', 'call_error']);

/**
 * A charging session's state (Sessions and Pricing design, "Session states").
 * Working states: authorising, starting, charging, suspended, idle, stopping.
 * End states: completed (priced), not_started, failed. The table keeps its enum's
 * original name; module 5 replaced the module 4 values (charging, ended).
 */
export const chargingSessionStatus = pgEnum('charging_session_status', [
  'authorising',
  'starting',
  'charging',
  'suspended',
  'idle',
  'stopping',
  'completed',
  'not_started',
  'failed',
]);

/** A tariff in use can be assigned to sites; an archived one is kept only for old sessions. */
export const tariffStatus = pgEnum('tariff_status', ['active', 'archived']);

/** What a receipt line charges for (Sessions and Pricing design, "Pricing engine"). */
export const sessionLineKind = pgEnum('session_line_kind', [
  'start_fee',
  'energy',
  'time',
  'idle',
  'adjustment',
]);

/**
 * How a tenant takes money (Stripe Payments design, "Payment modes"). direct: drivers pay
 * the tenant's own Stripe connected account (module 6). own_provider and managed are
 * reserved for later modules and refused by the API until then.
 */
export const paymentMode = pgEnum('payment_mode', ['direct', 'own_provider', 'managed']);

/**
 * A tenant's connected account: pending until Stripe lets it take charges, active while
 * it can, restricted when Stripe switched charges off again (details missing, past due).
 */
export const paymentAccountStatus = pgEnum('payment_account_status', [
  'pending',
  'active',
  'restricted',
]);

/** What a payment is for. Module 6 makes pre-authorisations only; prepay and postpay come with the drivers module. */
export const paymentType = pgEnum('payment_type', ['preauth', 'prepay', 'postpay']);

/**
 * A payment's life (Stripe Payments design, "Holds, capture and release"): pending while
 * the driver confirms the hold, authorised once the hold is on the card, then captured
 * (the final price was taken), released (nothing was taken) or failed (the card declined).
 * capture_failed needs a person; refunded and partially_refunded follow a capture.
 */
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'authorised',
  'captured',
  'released',
  'failed',
  'capture_failed',
  'partially_refunded',
  'refunded',
]);

/** A refund waits for a second person above the approval limit, then goes to the provider. */
export const refundStatus = pgEnum('refund_status', [
  'awaiting_approval',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
]);

/**
 * A Wattwisely staff member's role in the admin console (module 9). admin: everything;
 * billing: plans, add-ons and each tenant's plan; support: tenants and their plans, read-only
 * until support access arrives; viewer: read-only everywhere.
 */
export const platformRole = pgEnum('platform_role', ['admin', 'billing', 'support', 'viewer']);

/** A tenant's subscription: trialing until trial_ends_at, active, past_due (an invoice is unpaid), cancelled. */
export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
]);

/** What an add-on's price counts: connectors, sites, or the tenant as a whole. */
export const addonPricingUnit = pgEnum('addon_pricing_unit', [
  'per_connector',
  'per_site',
  'per_tenant',
]);

/**
 * Why a tenant has (or lacks) a module beyond its plan: bought as an add-on, a trial that
 * ends on a date, or an override by Wattwisely staff (which can also switch a plan's module off).
 */
export const entitlementSource = pgEnum('entitlement_source', ['addon', 'trial', 'override']);

/**
 * A managed service agreement's life: offered by Wattwisely and pending the Owner's acceptance,
 * active, ending (notice given, the end date is set), ended, or withdrawn before acceptance.
 */
export const managedServiceStatus = pgEnum('managed_service_status', [
  'pending_acceptance',
  'active',
  'ending',
  'ended',
  'withdrawn',
]);

/** A tariff change proposed by a Managed operator waits for the tenant's Owner (story MGT-03). */
export const tariffProposalStatus = pgEnum('tariff_proposal_status', [
  'proposed',
  'approved',
  'rejected',
  'withdrawn',
]);
