import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the managed service endpoints answer with. */
export class ManagedServiceErrors {
  static tenantNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'tenant_not_found',
      'This tenant does not exist.',
    );
  }

  static tenantDeleted(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tenant_deleted',
      'This tenant was deleted and cannot be changed.',
    );
  }

  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'managed_service_not_found',
      'This tenant has no managed service agreement.',
    );
  }

  static wrongStatus(detail: string): ProblemException {
    return new ProblemException(HttpStatus.CONFLICT, 'managed_service_status_conflict', detail);
  }

  static alreadyOffered(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'managed_service_exists',
      'This tenant already has a managed service agreement that is pending, active or ending.',
    );
  }

  static termsNotAccepted(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'terms_not_accepted',
      'Confirm that you accept the managed service terms.',
    );
  }

  static noticeTooShort(earliest: Date): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'notice_too_short',
      `The managed service ends at the earliest 30 days from now, on ${earliest.toISOString().slice(0, 10)}.`,
    );
  }

  static ownOwnerRequired(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'own_owner_required',
      'The tenant needs an Owner of its own before the managed service can end. Invite one first.',
    );
  }

  static staffNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'staff_not_found',
      'This person is not current Wattwisely staff.',
    );
  }

  static notManaged(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'not_managed',
      'Operators can only be assigned while the managed service is active. The Owner has to accept it first.',
    );
  }

  static alreadyOperator(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_operator',
      'This person already works in the tenant as its Managed operator.',
    );
  }

  static operatorNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'operator_not_found',
      'This person is not a Managed operator of the tenant.',
    );
  }

  static alreadyMember(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_member',
      'This person is already a member of the tenant in their own right. Remove that membership first.',
    );
  }

  static invalidMonth(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      'month must look like 2026-05 and lie in the past or the current month.',
    );
  }
}
