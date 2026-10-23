import { DisabledPaymentGateway, PaymentGateway } from '@wattwisely/payments';
import { StripeGateway } from './stripe-gateway';

/** Builds the gateway the API and the worker use: Stripe when a secret key is set, otherwise none. */
export class PaymentGatewayFactory {
  static fromKeys(keys: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  }): PaymentGateway {
    return keys.secretKey ? new StripeGateway(keys) : new DisabledPaymentGateway();
  }
}
