import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { WebhookReceipt, WhatsAppWebhookService } from './whatsapp-webhook.service';

/**
 * /v1/public/messaging/whatsapp: Meta's webhook (module 17). Public and exempt from the rate
 * limit like the Stripe webhook: the signature is what keeps strangers out.
 */
@ApiExcludeController()
@RouteAccess.public()
@RateLimit.exempt()
@Controller('public/messaging')
export class WhatsAppWebhookController {
  constructor(private readonly service: WhatsAppWebhookService) {}

  /** The subscription check: Meta expects the challenge back as plain text. */
  @Get('whatsapp')
  verify(
    @Query() query: Record<string, string | undefined>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): string {
    reply.type('text/plain');
    return this.service.verify(query);
  }

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  receive(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): Promise<WebhookReceipt> {
    return this.service.receive(request.rawBody, signature);
  }
}
