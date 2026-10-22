import { PaymentGateway, ReceivedEvent } from './payment-gateway';
import { PaymentGatewayError } from './payment-gateway.error';

/**
 * The gateway when no provider is configured (no STRIPE_SECRET_KEY): the portal shows
 * that payments are off, and every call answers payments_unavailable. Free sessions keep
 * working without it.
 */
export class DisabledPaymentGateway implements PaymentGateway {
  readonly provider = 'none';
  readonly isEnabled = false;

  publishableKey(): string | null {
    return null;
  }

  createAccount(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  getAccount(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  createOnboardingLink(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  createDashboardLink(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  createHold(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  getHold(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  capture(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  cancel(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  refund(): Promise<never> {
    return Promise.reject(PaymentGatewayError.unavailable());
  }

  parseWebhook(): ReceivedEvent {
    throw PaymentGatewayError.unavailable();
  }

  parseStoredEvent(): ReceivedEvent {
    throw PaymentGatewayError.unavailable();
  }
}
