import { HttpStatus } from '@nestjs/common';
import { PaymentGatewayError } from '@wattwisely/payments';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the payment endpoints answer with. */
export class PaymentErrors {
  static readonly GATEWAY_STATUS: Record<PaymentGatewayError['code'], HttpStatus> = {
    payments_unavailable: HttpStatus.SERVICE_UNAVAILABLE,
    invalid_signature: HttpStatus.BAD_REQUEST,
    card_declined: HttpStatus.PAYMENT_REQUIRED,
    provider_error: HttpStatus.BAD_GATEWAY,
  };

  /** A provider call that failed, as a problem: the gateway's code is the problem's code. */
  static fromGateway(error: unknown): ProblemException {
    if (error instanceof PaymentGatewayError) {
      return new ProblemException(
        PaymentErrors.GATEWAY_STATUS[error.code],
        error.code,
        error.message,
      );
    }
    throw error;
  }

  static notConnected(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'payment_account_missing',
      'Connect a Stripe account first.',
    );
  }

  static alreadyConnected(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'payment_account_exists',
      'This company already has a Stripe account.',
    );
  }

  static chargerNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'charger_not_found',
      'There is no charger with this identity.',
    );
  }

  static connectorNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'connector_not_found',
      'This charger has no such connector.',
    );
  }

  static connectorBusy(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'connector_busy',
      'A session is already running on this connector.',
    );
  }

  static paymentsNotAccepted(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'payments_not_accepted',
      'This charger does not take card payments yet.',
    );
  }

  static noTariff(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'no_tariff',
      'This charger has no prices yet, so it cannot take card payments.',
    );
  }

  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'payment_not_found',
      'This payment does not exist.',
    );
  }

  static refundNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'refund_not_found',
      'This refund does not exist.',
    );
  }

  static notRefundable(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'payment_not_refundable',
      'Only a captured payment can be refunded.',
    );
  }

  static refundTooLarge(available: number): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'refund_too_large',
      `At most ${available} (minor units) can still be refunded on this payment.`,
    );
  }

  static ownRefund(): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'refund_own_request',
      'A refund above the limit must be approved by someone other than its requester.',
    );
  }

  static refundNotAwaiting(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'refund_not_awaiting_approval',
      'This refund is no longer waiting for approval.',
    );
  }

  static invalidStatus(value: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `status: ${value} is not a payment status`,
    );
  }
}
