import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { RateLimit } from '../../../common/rate-limit/rate-limit.decorator';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { WebhookReceiptDto } from './webhook-receipt.dto';
import { WebhookService } from './webhook.service';

/**
 * POST /v1/webhooks/stripe: the Connect webhook endpoint (Stripe Payments design, "Webhooks").
 * Stripe signs each delivery over the exact bytes, so the handler reads the raw body, not the
 * parsed one. A bad signature is 400; anything stored is 200, even when handling it must wait.
 */
@ApiExcludeController()
@RouteAccess.public()
@RateLimit.exempt()
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly service: WebhookService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  stripe(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<WebhookReceiptDto> {
    return this.service.receive(request.rawBody, signature);
  }
}
