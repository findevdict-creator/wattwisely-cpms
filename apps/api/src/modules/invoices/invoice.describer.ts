import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { PlatformTransaction } from '../../common/platform/platform-transaction';
import { RequestAuth } from '../../common/request/request-auth';
import { InvoiceDto } from './dto/invoice.dto';
import { InvoiceErrors } from './invoice-errors';
import { InvoiceWithLines } from './invoice-record';
import { InvoicesRepository } from './invoices.repository';

/** Finds invoices for the admin console's endpoints and builds their answer. */
@Injectable()
export class InvoiceDescriber {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly invoices: InvoicesRepository,
  ) {}

  /** The invoice with its lines, or 404. */
  async require(tx: Transaction, id: string): Promise<InvoiceWithLines> {
    const record = await this.invoices.findById(tx, id);
    if (!record) {
      throw InvoiceErrors.notFound();
    }
    return record;
  }

  /** Which tenant an invoice belongs to, so a change can run inside that tenant. */
  async tenantOf(auth: RequestAuth, id: string): Promise<string> {
    const record = await this.platform.run(auth, (tx) => this.require(tx, id));
    return record.invoice.tenantId;
  }

  async describe(tx: Transaction, id: string): Promise<InvoiceDto> {
    return new InvoiceDto(await this.require(tx, id));
  }
}
