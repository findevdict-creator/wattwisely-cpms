import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { RateLimit } from '../../../common/rate-limit/rate-limit.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CardSetupDto } from './dto/card-setup.dto';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { PaymentMethodsDto } from './dto/payment-methods.dto';
import { SavePaymentMethodRequestDto } from './dto/save-payment-method-request.dto';
import { UpdatePaymentMethodRequestDto } from './dto/update-payment-method-request.dto';
import { DriverPaymentMethodsService } from './payment-methods.service';

/** /v1/driver/payment-methods: the cards a driver saved to pay with (module 19). */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/payment-methods')
export class DriverPaymentMethodsController {
  constructor(private readonly service: DriverPaymentMethodsService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<PaymentMethodsDto> {
    return this.service.list(auth);
  }

  /** Begins saving a card: the page confirms the setup with the provider's form, then posts it back. */
  @Post('setup')
  @RateLimit.policy('public_write')
  setup(@CurrentAuth() auth: RequestAuth): Promise<CardSetupDto> {
    return this.service.setup(auth);
  }

  @Post()
  save(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: SavePaymentMethodRequestDto,
  ): Promise<PaymentMethodDto> {
    return this.service.save(auth, body);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: UpdatePaymentMethodRequestDto,
  ): Promise<PaymentMethodDto> {
    return this.service.makeDefault(auth, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<void> {
    return this.service.remove(auth, id);
  }
}
