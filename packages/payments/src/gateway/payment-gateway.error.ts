/** Why a provider call did not do what was asked. */
export type PaymentGatewayErrorCode =
  'payments_unavailable' | 'invalid_signature' | 'card_declined' | 'provider_error';

/**
 * A provider call that failed, with a code the API turns into a problem and a flag that
 * tells the worker whether trying again later makes sense (the provider was down) or not
 * (the card refused, the hold is gone).
 */
export class PaymentGatewayError extends Error {
  constructor(
    readonly code: PaymentGatewayErrorCode,
    message: string,
    readonly isRetryable = false,
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }

  static unavailable(): PaymentGatewayError {
    return new PaymentGatewayError(
      'payments_unavailable',
      'Card payments are not set up on this platform.',
    );
  }

  static invalidSignature(detail: string): PaymentGatewayError {
    return new PaymentGatewayError('invalid_signature', `Webhook signature rejected: ${detail}`);
  }

  static isRetryable(error: unknown): boolean {
    return error instanceof PaymentGatewayError ? error.isRetryable : true;
  }
}
