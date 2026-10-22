import { HttpStatus } from '@nestjs/common';
import { ProblemException } from './problem.exception';

/** The answer when someone else saved a change since the client loaded the record. */
export class VersionConflict {
  static exception(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'version_conflict',
      'Someone else changed this in the meantime. Reload it and make your change again.',
    );
  }
}
