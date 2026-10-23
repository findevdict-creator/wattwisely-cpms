import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { AlertFinding } from '../alert-finding';
import { AlertDetector } from './alert-detector';

/** A connector whose last status was Faulted, with the error codes the charger sent (NTF-04). */
@Injectable()
export class ConnectorFaultedDetector extends AlertDetector {
  readonly type = 'connector_faulted' as const;

  async find(tx: Transaction, now: Date): Promise<AlertFinding[]> {
    const result = await tx.execute<{
      id: string;
      charger_id: string;
      site_id: string;
      ocpp_identity: string;
      label: string;
      error_code: string | null;
      vendor_error_code: string | null;
      status_changed_at: string | null;
    }>(sql`
      select co.id, co.charger_id, c.site_id, c.ocpp_identity, co.label, co.error_code,
        co.vendor_error_code, co.status_changed_at
      from connectors co join chargers c on c.id = co.charger_id
      where co.status = 'faulted' and c.deleted_at is null`);
    return result.rows.map((row) => ({
      type: this.type,
      subjectKey: row.id,
      siteId: row.site_id,
      chargerId: row.charger_id,
      connectorId: row.id,
      sessionId: null,
      title: `${row.ocpp_identity} connector ${row.label} is faulted`,
      details: { error_code: row.error_code, vendor_error_code: row.vendor_error_code },
      beganAt: row.status_changed_at ? new Date(row.status_changed_at) : now,
    }));
  }
}
