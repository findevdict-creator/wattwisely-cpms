import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceSummaryDto } from '../dto/invoice-summary.dto';
import { InvoicesService } from './invoices.service';

/** /v1/invoices: the invoices Wattwisely issued to the company, for those with invoices:read. */
@ApiTags('settings')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('invoices:read')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<InvoiceSummaryDto[]> {
    return this.invoices.list(auth.requireAccess());
  }

  @Get(':id')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<InvoiceDto> {
    return this.invoices.get(auth.requireAccess(), id);
  }
}
