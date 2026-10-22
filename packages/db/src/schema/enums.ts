import { pgEnum } from 'drizzle-orm/pg-core';

/** trial and active tenants work normally; suspended tenants are read-only; cancelled tenants are closed. */
export const tenantStatus = pgEnum('tenant_status', ['trial', 'active', 'suspended', 'cancelled']);

/** invited: e-mail sent, not accepted yet. active: can work in the tenant. removed: access ended. */
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'removed']);

/** Who did something recorded in the audit log. */
export const auditActorType = pgEnum('audit_actor_type', ['user', 'api_key', 'support', 'system']);
