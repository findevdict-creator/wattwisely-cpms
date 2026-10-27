import { Injectable } from '@nestjs/common';
import { PageRequest } from '../../../common/paging/page-request';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoicePageDto } from '../dto/invoice-page.dto';
import { InvoiceSummaryDto } from '../dto/invoice-summary.dto';
import { ListInvoicesQueryDto } from '../dto/list-invoices-query.dto';
import { InvoiceDescriber } from '../invoice.describer';
import { InvoicesRepository } from '../invoices.repository';

/** The admin console's invoice list across tenants, and one invoice with its lines. */
@Injectable()
export class AdminInvoicesService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly invoices: InvoicesRepository,
    private readonly describer: InvoiceDescriber,
  ) {}

  async list(auth: RequestAuth, query: ListInvoicesQueryDto): Promise<InvoicePageDto> {
    const page = PageRequest.from(query);
    const records = await this.platform.run(auth, (tx) =>
      this.invoices.findPage(tx, query, page.cursor, page.fetchSize),
    );
    const summaries = records.map((record) => new InvoiceSummaryDto(record));
    const { items, nextCursor } = page.cut(summaries, (summary) => summary.period_start);
    return new InvoicePageDto(items, nextCursor);
  }

  get(auth: RequestAuth, id: string): Promise<InvoiceDto> {
    return this.platform.run(auth, (tx) => this.describer.describe(tx, id));
  }
}
