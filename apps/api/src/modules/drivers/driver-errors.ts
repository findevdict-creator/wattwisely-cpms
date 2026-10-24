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

  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'driver_not_found',
      'This driver does not exist.',
    );
  }

  /** For a driver named in a request body, e.g. the members of a group. */
  static unknown(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'driver_not_found',
      'One of the drivers does not exist.',
    );
  }

  static emailTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'driver_email_taken',
      'Another driver already has this e-mail address.',
    );
  }

  static alreadyBlocked(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'driver_already_blocked',
      'This driver is already blocked.',
    );
  }

  static notBlocked(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'driver_not_blocked',
      'This driver is not blocked.',
    );
  }

  static cardNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'card_not_found',
      'This card does not exist.',
    );
  }

  static cardTagTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'card_tag_taken',
      'A card with this tag is already registered.',
    );
  }

  static groupNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'access_group_not_found',
      'This access group does not exist.',
    );
  }

  /** For a group named in a request body, e.g. the groups of a driver. */
  static groupUnknown(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'access_group_not_found',
      'One of the access groups does not exist.',
    );
  }

  static groupNameTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'access_group_name_taken',
      'You already have an access group with this name.',
    );
  }
}
