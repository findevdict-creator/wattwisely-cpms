import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** The problems the staff endpoints answer with. */
export class StaffErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'staff_not_found',
      'This staff member does not exist.',
    );
  }

  static alreadyStaff(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_staff',
      'This person is already Wattwisely staff. Change their role instead.',
    );
  }

  static lastAdmin(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'last_admin',
      'There must always be at least one admin. Make someone else admin first.',
    );
  }
}
