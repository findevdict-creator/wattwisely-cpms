import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateInvoiceRequestDto } from '../dto/create-invoice-request.dto';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceCreationService } from './invoice-creation.service';

/** POST /v1/admin/tenants/{id}/invoices: a draft for a past month, by hand. The list is GET /v1/admin/invoices?tenant_id=. */
@ApiTags('admin')
@ApiBearerAuth()
@RouteAccess.platform('billing:write')
@Controller('admin/tenants/:id/invoices')
export class AdminTenantInvoicesController {
  constructor(private readonly invoices: InvoiceCreationService) {}

  @Post()
  create(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') tenantId: string,
    @Body() body: CreateInvoiceRequestDto,
  ): Promise<InvoiceDto> {
    return this.invoices.create(auth, tenantId, body);
  }
}
