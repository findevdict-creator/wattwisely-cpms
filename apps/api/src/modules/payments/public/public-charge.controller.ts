import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { ChargeDto } from './dto/charge.dto';
import { StartChargeRequestDto } from './dto/start-charge-request.dto';
import { PublicChargeService } from './public-charge.service';

/**
 * /v1/public/charges: a driver pays by card at a charger, with no account (Stripe Payments
 * design, "Paid charge flow"). The charge key in the URL stands in for a login, so these
 * routes are public; the key is long, random and known only to the page that started the charge.
 */
@ApiTags('public')
@RouteAccess.public()
@Controller('public/charges')
export class PublicChargeController {
  constructor(private readonly service: PublicChargeService) {}

  /** Opens the session and the card hold; the page confirms the hold with client_secret. */
  @Post()
  start(@Body() body: StartChargeRequestDto): Promise<ChargeDto> {
    return this.service.start(body);
  }

  @Get(':key')
  status(@Param('key') key: string): Promise<ChargeDto> {
    return this.service.status(key);
  }

  /** After the card form finished: reads the hold now, so the charger starts without waiting for the webhook. */
  @Post(':key/check')
  @HttpCode(HttpStatus.OK)
  check(@Param('key') key: string): Promise<ChargeDto> {
    return this.service.check(key);
  }
}
