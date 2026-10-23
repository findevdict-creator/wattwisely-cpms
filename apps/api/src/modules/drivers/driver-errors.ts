import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the driver endpoints answer with, besides the payment ones. */
export class DriverErrors {
  static chargeNotRunning(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'charge_not_running',
      'This charge is not running, so there is nothing to stop.',
    );
  }
}
