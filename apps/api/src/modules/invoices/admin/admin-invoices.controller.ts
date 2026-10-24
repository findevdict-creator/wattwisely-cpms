import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdjustmentRequestDto } from '../dto/adjustment-request.dto';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoicePageDto } from '../dto/invoice-page.dto';
import { IssueInvoiceResultDto } from '../dto/issue-invoice-result.dto';
import { ListInvoicesQueryDto } from '../dto/list-invoices-query.dto';
import { PayInvoiceRequestDto } from '../dto/pay-invoice-request.dto';
import { VoidInvoiceRequestDto } from '../dto/void-invoice-request.dto';
import { AdminInvoicesService } from './admin-invoices.service';
import { InvoiceDraftService } from './invoice-draft.service';
import { InvoiceLifecycleService } from './invoice-lifecycle.service';

/** /v1/admin/invoices: every tenant's invoices, for Wattwisely's billing staff (module 15). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(
    private readonly invoices: AdminInvoicesService,
    private readonly drafts: InvoiceDraftService,
    private readonly lifecycle: InvoiceLifecycleService,
  ) {}

  @Get()
  @RouteAccess.platform('billing:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<InvoicePageDto> {
    return this.invoices.list(auth, query);
  }

  @Get(':id')
  @RouteAccess.platform('billing:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<InvoiceDto> {
    return this.invoices.get(auth, id);
  }

  @Post(':id/lines')
  @RouteAccess.platform('billing:write')
  addLine(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: AdjustmentRequestDto,
  ): Promise<InvoiceDto> {
    return this.drafts.addLine(auth, { id, version }, body);
  }

  @Delete(':id/lines/:lineId')
  @RouteAccess.platform('billing:write')
  removeLine(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @IfMatch() version: number,
  ): Promise<InvoiceDto> {
    return this.drafts.removeLine(auth, { id, version }, lineId);
  }

  @Post(':id/regenerate')
  @HttpCode(200)
  @RouteAccess.platform('billing:write')
  regenerate(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<InvoiceDto> {
    return this.drafts.regenerate(auth, { id, version });
  }

  @Post(':id/issue')
  @HttpCode(200)
  @RouteAccess.platform('billing:write')
  issue(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<IssueInvoiceResultDto> {
    return this.lifecycle.issue(auth, { id, version });
  }

  @Post(':id/pay')
  @HttpCode(200)
  @RouteAccess.platform('billing:write')
  pay(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: PayInvoiceRequestDto,
  ): Promise<InvoiceDto> {
    return this.lifecycle.pay(auth, { id, version }, body);
  }

  @Post(':id/void')
  @HttpCode(200)
  @RouteAccess.platform('billing:write')
  void(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: VoidInvoiceRequestDto,
  ): Promise<InvoiceDto> {
    return this.lifecycle.void(auth, { id, version }, body);
  }
}
