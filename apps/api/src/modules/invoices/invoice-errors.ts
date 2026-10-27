import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the invoice endpoints answer with. */
export class InvoiceErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'invoice_not_found',
      'This invoice does not exist.',
    );
  }

  static lineNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'invoice_line_not_found',
      'This invoice has no such line.',
    );
  }

  static wrongStatus(detail: string): ProblemException {
    return new ProblemException(HttpStatus.CONFLICT, 'invoice_status_conflict', detail);
  }

  static badMonth(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      'month must read like 2026-09.',
    );
  }

  static monthNotOver(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'invoice_month_not_over',
      'A month can be invoiced once it is over.',
    );
  }

  static exists(month: string): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'invoice_exists',
      `This tenant already has an invoice for ${month}. Void it first to draft the month again.`,
    );
  }

  static planMissing(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'plan_missing',
      'This tenant has no plan to bill, or its subscription is cancelled.',
    );
  }
}
