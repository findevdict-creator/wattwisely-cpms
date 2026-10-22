import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the tariffs endpoints answer with. */
export class TariffErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'tariff_not_found',
      'This tariff does not exist.',
    );
  }

  /** For a tariff named in a request body (assigning one to a site). */
  static unknown(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'tariff_not_found',
      'This tariff does not exist or is archived.',
    );
  }

  static nameTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tariff_name_taken',
      'You already have a tariff with this name.',
    );
  }

  static inUse(siteCount: number): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tariff_in_use',
      `${siteCount} site(s) use this tariff. Give them another tariff first.`,
    );
  }

  static archived(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tariff_archived',
      'This tariff is archived, so its prices cannot change.',
    );
  }

  /** The bands leave a gap or overlap, or the limits contradict each other. */
  static invalidPrices(problems: string[]): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'tariff_invalid',
      problems.join(' '),
    );
  }
}
