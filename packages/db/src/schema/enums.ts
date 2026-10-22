import { pgEnum } from 'drizzle-orm/pg-core';

/** trial and active tenants work normally; suspended tenants are read-only; cancelled tenants are closed. */
export const tenantStatus = pgEnum('tenant_status', ['trial', 'active', 'suspended', 'cancelled']);

/** invited: e-mail sent, not accepted yet. active: can work in the tenant. removed: access ended. */
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'removed']);

/** Who did something recorded in the audit log. */
export const auditActorType = pgEnum('audit_actor_type', ['user', 'api_key', 'support', 'system']);

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
 * A charging session as the gateway records it from StartTransaction to StopTransaction.
 * Module 5 (sessions and pricing) adds the states around these two.
 */
export const chargingSessionStatus = pgEnum('charging_session_status', ['charging', 'ended']);
