import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceSummaryDto } from '../dto/invoice-summary.dto';
import { InvoiceErrors } from '../invoice-errors';
import { InvoicesRepository } from '../invoices.repository';

/** The tenant's own view of Wattwisely's invoices to it (Settings, Invoices). Drafts stay hidden. */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly invoices: InvoicesRepository,
  ) {}

  async list(access: TenantAccess): Promise<InvoiceSummaryDto[]> {
    const records = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.invoices.findForTenant(tx, access.tenant.id),
    );
    return records.map((record) => new InvoiceSummaryDto(record));
  }

  async get(access: TenantAccess, id: string): Promise<InvoiceDto> {
    const record = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.invoices.findById(tx, id),
    );
    if (!record || record.invoice.tenantId !== access.tenant.id) {
      throw InvoiceErrors.notFound();
    }
    return new InvoiceDto(record);
  }
}
