import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the team endpoints answer with, in one place so codes stay consistent. */
export class TeamErrors {
  static memberNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'member_not_found',
      'This member does not exist.',
    );
  }

  static alreadyMember(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_member',
      'This person is already in your team.',
    );
  }

  static alreadyInvited(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_invited',
      'This person already has a pending invitation. Resend it instead.',
    );
  }

  static wrongStatus(expected: string): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'member_status_conflict',
      `Only ${expected} members can be changed this way.`,
    );
  }

  /** A Managed operator's membership belongs to the agreement: the admin console changes it (module 10). */
  static managedOperatorProtected(): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'managed_operator_protected',
      'This person works in your account for Wattwisely under the managed service agreement. Contact your account manager to change that.',
    );
  }

  static lastOwner(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'last_owner',
      'A tenant must always have at least one Owner. Make someone else Owner first.',
    );
  }
}
