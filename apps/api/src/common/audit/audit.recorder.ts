import { Injectable } from '@nestjs/common';
import { auditLog } from '@wattwisely/db';
import { Transaction } from '../database/transaction-runner';
import { UuidV7 } from '../database/uuid-v7';
import { RequestAuth } from '../request/request-auth';
import { AuditEntry } from './audit-entry';

/**
 * Writes to the audit log (story SEC-01). Services call it inside the same
 * transaction as the change itself, so a change is never saved without its entry.
 * The actor, tenant, IP address and request id come from the request.
 */
@Injectable()
export class AuditRecorder {
  /** `tenantId` defaults to the request's tenant; pass it on routes without one (accepting an invitation). */
  async record(
    tx: Transaction,
    auth: RequestAuth,
    entry: AuditEntry,
    tenantId: string = auth.requireAccess().tenant.id,
  ): Promise<void> {
    const account = auth.requireAccount();
    await tx.insert(auditLog).values({
      id: UuidV7.create(),
      tenantId,
      actorType: 'user',
      actorId: account.id,
      actorLabel: account.label,
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
}
