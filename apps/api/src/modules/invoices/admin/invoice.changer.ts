import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceDescriber } from '../invoice.describer';
import { InvoiceErrors } from '../invoice-errors';
import { InvoiceRow, InvoiceWithLines } from '../invoice-record';
import { InvoiceChange, InvoiceWriter } from './invoice.writer';

/** Which invoice, and the version the caller saw. */
export interface InvoiceTarget {
  id: string;
  version: number;
}

/** The work of one change: it reads the invoice as it is and writes through apply(). */
export type InvoiceWork = (tx: Transaction, record: InvoiceWithLines) => Promise<void>;

/**
 * Runs one change to an invoice: one transaction in the invoice's tenant (so the audit
 * entry lands in that tenant's log), the invoice as it is now, the work, and the fresh
 * invoice as the answer.
 */
@Injectable()
export class InvoiceChanger {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly describer: InvoiceDescriber,
    private readonly writer: InvoiceWriter,
  ) {}

  async change(auth: RequestAuth, target: InvoiceTarget, work: InvoiceWork): Promise<InvoiceDto> {
    const tenantId = await this.describer.tenantOf(auth, target.id);
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      await work(tx, await this.describer.require(tx, target.id));
      return this.describer.describe(tx, target.id);
    });
  }

  /** The same, but only a draft; anything issued is final and has to be voided instead. */
  changeDraft(auth: RequestAuth, target: InvoiceTarget, work: InvoiceWork): Promise<InvoiceDto> {
    return this.change(auth, target, async (tx, record) => {
      if (record.invoice.status !== 'draft') {
        throw InvoiceErrors.wrongStatus(
          'Only a draft can be changed. Void the invoice and draft the month again.',
        );
      }
      await work(tx, record);
    });
  }

  /** Writes the change if the version still matches, with its audit entry. */
  apply(tx: Transaction, auth: RequestAuth, invoice: InvoiceRow, change: InvoiceChange) {
    return this.writer.apply(tx, auth, invoice, change);
  }
}
