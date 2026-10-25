import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';
import { DriverChargeRefusal, DriverPlaceAccessPolicy } from './places/driver-place-access';

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

  static cardNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'card_not_found',
      'This saved card does not exist or was removed.',
    );
  }

  /** The provider's form did not finish: the setup is not succeeded, or carries no card. */
  static cardSetupIncomplete(failure: string | null): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'card_setup_incomplete',
      failure
        ? `The card could not be saved: ${failure}`
        : 'The card form has not confirmed a card yet. Finish it, then try again.',
    );
  }

  /** The operator has no record of this login: the driver must agree to one before charging here. */
  static consentRequired(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'consent_required',
      'This operator has no record of you yet. Agree to one to charge here.',
    );
  }

  /** The unique index drivers_email_unique: the operator already knows this e-mail, unlinked. */
  static driverRecordExists(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'driver_record_exists',
      'This operator already keeps a driver record with your e-mail address. Ask them to invite you, so the two are linked.',
    );
  }

  /** The start is refused for the reason the place page showed; the code is that reason. */
  static cannotCharge(reason: DriverChargeRefusal): ProblemException {
    return new ProblemException(HttpStatus.CONFLICT, reason, DriverPlaceAccessPolicy.WORDS[reason]);
  }

  static chargeNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'charge_not_found',
      'This charge is not one of yours, or does not exist.',
    );
  }
}
