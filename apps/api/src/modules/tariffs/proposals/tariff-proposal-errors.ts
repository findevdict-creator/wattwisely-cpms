import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** The problems the tariff proposal endpoints answer with. */
export class TariffProposalErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'tariff_proposal_not_found',
      'This proposal does not exist.',
    );
  }

  static nameRequired(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'validation_failed',
      'A proposal for a new tariff needs a name and a currency.',
    );
  }

  static decided(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tariff_proposal_decided',
      'This proposal was already decided or withdrawn.',
    );
  }

  static commentRequired(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'validation_failed',
      'Say in a comment why you reject the proposal.',
    );
  }
}
