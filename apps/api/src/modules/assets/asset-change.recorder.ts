import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { RequestAuth } from '../../common/request/request-auth';

/** What an audit entry about a site, charger or connector names. */
export interface AssetTarget {
  type: 'site' | 'charger' | 'connector';
  id: string;
  /** The site name, charger identity or connector label, so entries read well later. */
  label: string;
}

/**
 * Writes site, charger and connector changes to the audit log, in the same transaction
 * as the change (story SEC-01). Actions read "<area>.<what happened>", e.g. "chargers.registered".
 */
@Injectable()
export class AssetChangeRecorder {
  constructor(private readonly auditRecorder: AuditRecorder) {}

  async record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { target: AssetTarget; before?: object | null; after?: object | null },
  ): Promise<void> {
    await this.auditRecorder.record(tx, auth, {
      action,
      targetType: change.target.type,
      targetId: change.target.id,
      targetLabel: change.target.label,
      before: change.before ?? null,
      after: change.after ?? null,
    });
  }
}
