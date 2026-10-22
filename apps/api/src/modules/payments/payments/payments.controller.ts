import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentDetailDto } from './dto/payment-detail.dto';
import { PaymentPageDto } from './dto/payment-page.dto';
import { PaymentsService } from './payments.service';

/** /v1/payments: card payments and what became of them (Stripe Payments design). */
@ApiTags('payments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @RouteAccess.requires('payments:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaymentPageDto> {
    return this.service.list(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('payments:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<PaymentDetailDto> {
    return this.service.get(auth.requireAccess(), id);
  }
}
