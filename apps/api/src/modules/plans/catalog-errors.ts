import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the plan and add-on endpoints answer with. */
export class CatalogErrors {
  static planNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'plan_not_found',
      'This plan does not exist.',
    );
  }

  static planCodeTaken(code: string): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'plan_code_taken',
      `A plan with the code "${code}" already exists.`,
    );
  }

  static planInactive(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'plan_inactive',
      'This plan is no longer sold. Pick an active plan.',
    );
  }

  static addonNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'addon_not_found',
      'This add-on does not exist.',
    );
  }

  static unknownModule(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `"${key}" is not a module a plan can include.`,
    );
  }
}
