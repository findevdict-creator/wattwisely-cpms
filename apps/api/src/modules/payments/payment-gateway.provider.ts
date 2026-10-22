import { Provider } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { PaymentGatewayFactory } from '@wattwisely/payments-stripe';
import { ApiConfig } from '../../config/api.config';

/** Provides the PaymentGateway: Stripe with the configured keys, or none when there are no keys. */
export class PaymentGatewayProvider {
  static readonly PROVIDER: Provider = {
    provide: PAYMENT_GATEWAY,
    useFactory: (config: ApiConfig) =>
      PaymentGatewayFactory.fromKeys({
        secretKey: config.stripeSecretKey,
        publishableKey: config.stripePublishableKey,
        webhookSecret: config.stripeWebhookSecret,
      }),
    inject: [ApiConfig],
  };
}
