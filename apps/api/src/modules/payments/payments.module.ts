import { Module } from '@nestjs/common';
import { PaymentAccountController } from './account/payment-account.controller';
import { PaymentAccountService } from './account/payment-account.service';
import { PaymentGatewayProvider } from './payment-gateway.provider';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsRepository } from './payments/payments.repository';
import { PaymentsService } from './payments/payments.service';
import { ChargePlaceLookup } from './public/charge-place.lookup';
import { PublicChargeController } from './public/public-charge.controller';
import { PublicChargeService } from './public/public-charge.service';
import { RefundExecutor } from './refunds/refund-executor';
import { RefundsController } from './refunds/refunds.controller';
import { RefundsService } from './refunds/refunds.service';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';
import { WebhookService } from './webhooks/webhook.service';

/**
 * Card payments through Stripe Connect (module 6): the company's connected account, a
 * driver's paid charge, Stripe's webhooks, and payments and refunds for staff. Everything
 * talks to the provider through the PaymentGateway interface, so Stripe can be swapped.
 */
@Module({
  controllers: [
    PaymentAccountController,
    PublicChargeController,
    StripeWebhookController,
    PaymentsController,
    RefundsController,
  ],
  providers: [
    PaymentGatewayProvider.PROVIDER,
    PaymentAccountService,
    ChargePlaceLookup,
    PublicChargeService,
    WebhookService,
    PaymentsRepository,
    PaymentsService,
    RefundExecutor,
    RefundsService,
  ],
})
export class PaymentsModule {}
