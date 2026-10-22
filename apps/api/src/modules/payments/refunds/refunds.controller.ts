import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto';
import { RefundDto } from './dto/refund.dto';
import { RefundsService } from './refunds.service';

/** Refunds of card payments: requesting, the approval queue, approving and cancelling. */
@ApiTags('payments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller()
export class RefundsController {
  constructor(private readonly service: RefundsService) {}

  /** Refunds up to the limit go to the provider at once; larger ones wait for a second person. */
  @Post('payments/:id/refunds')
  @RouteAccess.requires('payments:refund')
  request(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') paymentId: string,
    @Body() body: CreateRefundRequestDto,
  ): Promise<RefundDto> {
    return this.service.request(auth, paymentId, body);
  }

  @Get('refunds')
  @RouteAccess.requires('payments:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListRefundsQueryDto,
  ): Promise<RefundDto[]> {
    return this.service.list(auth.requireAccess(), query);
  }

  @Post('refunds/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('payments:approve_refund')
  approve(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<RefundDto> {
    return this.service.approve(auth, id);
  }

  @Post('refunds/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('payments:refund')
  cancel(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<RefundDto> {
    return this.service.cancel(auth, id);
  }
}
