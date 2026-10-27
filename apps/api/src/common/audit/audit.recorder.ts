import { Injectable } from '@nestjs/common';
import { auditLog, Transaction, UuidV7 } from '@wattwisely/db';
import { RequestAuth } from '../request/request-auth';
import { AuditEntry } from './audit-entry';

/** The actor types the recorder writes; support and system come from elsewhere. */
type AuditActorType = 'platform' | 'managed' | 'user' | 'api_key' | 'driver';

/**
 * Writes to the audit log (story SEC-01). Services call it inside the same
 * transaction as the change itself, so a change is never saved without its entry.
 * The actor, tenant, IP address and request id come from the request. Wattwisely staff in
 * the admin console are recorded as actor type "platform" (module 9); staff working inside
 * a tenant as its Managed operator as "managed", so the tenant can tell them apart (module 10).
 * A request made with an API key is recorded as actor type "api_key", with the key as the
 * actor (module 16): what an integration did is never mistaken for what a person did. A driver
 * acting from the driver app is recorded as "driver" (module 19), with their account as the actor.
 */
@Injectable()
export class AuditRecorder {
  /**
   * `tenantId` defaults to the request's tenant; pass it on routes without one (accepting
   * an invitation, the admin console) and null for a platform action that concerns no tenant.
   */
  async record(
    tx: Transaction,
    auth: RequestAuth,
    entry: AuditEntry,
    tenantId: string | null = auth.requireAccess().tenant.id,
  ): Promise<void> {
    const actor = auth.apiKey ?? auth.driver ?? auth.requireAccount();
    await tx.insert(auditLog).values({
      id: UuidV7.create(),
      tenantId,
      actorType: AuditRecorder.actorTypeOf(auth),
      actorId: actor.id,
      actorLabel: actor.label,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: auth.origin.ip,
      requestId: auth.origin.requestId,
    });
  }

  private static actorTypeOf(auth: RequestAuth): AuditActorType {
    if (auth.apiKey) {
      return 'api_key';
    }
    if (auth.driver) {
      return 'driver';
    }
    if (auth.platform) {
      return 'platform';
    }
    return auth.access?.isManagedOperator ? 'managed' : 'user';
  }
}
