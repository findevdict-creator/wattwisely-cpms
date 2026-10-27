import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvoiceRow } from '../invoice-record';
import { InvoiceChanges, InvoicesRepository } from '../invoices.repository';

/** A change to an invoice: what changes, the audit action, and the version the caller saw. */
export interface InvoiceChange {
  /** E.g. "admin.invoice_issued". */
  action: string;
  changes: InvoiceChanges;
  version: number;
  /** What the audit entry says happened, besides the status. */
  after?: Record<string, unknown>;
}

/**
 * Writes a change to an invoice inside the caller's transaction, if the row still has the
 * version the caller saw, and records it in the tenant's audit log so its Owners can see
 * who issued, settled or cancelled what.
 */
@Injectable()
export class InvoiceWriter {
  constructor(
    private readonly invoices: InvoicesRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async apply(
    tx: Transaction,
    auth: RequestAuth,
    invoice: InvoiceRow,
    change: InvoiceChange,
  ): Promise<void> {
    if (!(await this.invoices.update(tx, invoice.id, change.version, change.changes))) {
      throw VersionConflict.exception();
    }
    await this.audit.record(
      tx,
      auth,
      {
        action: change.action,
        targetType: 'invoice',
        targetId: invoice.id,
        targetLabel: change.changes.number ?? invoice.number ?? invoice.periodStart.slice(0, 7),
        before: { status: invoice.status, total: invoice.total },
        after: {
          status: change.changes.status ?? invoice.status,
          currency: invoice.currency,
          ...change.after,
        },
      },
      invoice.tenantId,
    );
  }
}
