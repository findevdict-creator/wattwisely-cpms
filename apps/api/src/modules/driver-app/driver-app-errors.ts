import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the /v1/driver routes answer with (module 19). */
export class DriverAppErrors {
  static invitationNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'invitation_not_found',
      'This invitation was already used or cancelled. Ask the operator for a new one.',
    );
  }

  static invitationExpired(): ProblemException {
    return new ProblemException(
      HttpStatus.GONE,
      'invitation_expired',
      'This invitation has expired. Ask the operator for a new one.',
    );
  }

  static invitationForSomeoneElse(email: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'invitation_for_someone_else',
      `This invitation was sent to ${email}. Log in with that address to accept it.`,
    );
  }

  /** The operator deleted the driver record, or linked another login to it, after inviting. */
  static invitationStale(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'invitation_stale',
      'The operator changed this driver record since the invitation was sent. Ask them for a new one.',
    );
  }

  /** The unique index drivers_account_unique: one login per driver of a tenant. */
  static accountAlreadyLinked(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'account_already_linked',
      'Your login is already linked to another driver record of this operator.',
    );
  }

  static operatorNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'operator_not_found',
      'You are not linked to this operator.',
    );
  }
}
