import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** Why a routing could not be saved. */
export class AlertRuleErrors {
  static invalid(index: number, detail: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `rules[${index}]: ${detail}`,
    );
  }
}
