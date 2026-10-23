import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AccountLinkDto } from './dto/account-link.dto';
import { ConnectAccountRequestDto } from './dto/connect-account-request.dto';
import { PaymentAccountDto } from './dto/payment-account.dto';
import { UpdateHoldRequestDto } from './dto/update-hold-request.dto';
import { PaymentAccountService } from './payment-account.service';

/** /v1/payment-account: the company's Stripe connected account (Stripe Payments design). */
@ApiTags('payments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('payment-account')
export class PaymentAccountController {
  constructor(private readonly service: PaymentAccountService) {}

  @Get()
  @RouteAccess.requires('settings:payments')
  get(@CurrentAuth() auth: RequestAuth): Promise<PaymentAccountDto> {
    return this.service.get(auth.requireAccess());
  }

  /** Opens the Express account. Follow with POST onboarding-link to let Stripe collect the details. */
  @Post()
  @RouteAccess.requires('settings:payments')
  connect(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: ConnectAccountRequestDto,
  ): Promise<PaymentAccountDto> {
    return this.service.connect(auth, body);
  }

  @Post('onboarding-link')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('settings:payments')
  onboardingLink(@CurrentAuth() auth: RequestAuth): Promise<AccountLinkDto> {
    return this.service.onboardingLink(auth.requireAccess());
  }

  @Post('dashboard-link')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('settings:payments')
  dashboardLink(@CurrentAuth() auth: RequestAuth): Promise<AccountLinkDto> {
    return this.service.dashboardLink(auth.requireAccess());
  }

  /** Re-reads the account from Stripe, for when a webhook did not arrive. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('settings:payments')
  refresh(@CurrentAuth() auth: RequestAuth): Promise<PaymentAccountDto> {
    return this.service.refresh(auth.requireAccess());
  }

  @Patch()
  @RouteAccess.requires('settings:payments')
  updateHold(
    @CurrentAuth() auth: RequestAuth,
    @IfMatch() version: number,
    @Body() body: UpdateHoldRequestDto,
  ): Promise<PaymentAccountDto> {
    return this.service.updateHold(auth, version, body);
  }
}
