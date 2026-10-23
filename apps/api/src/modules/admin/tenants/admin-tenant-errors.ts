import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** The problems the admin console's tenant endpoints answer with. */
export class AdminTenantErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'tenant_not_found',
      'This tenant does not exist.',
    );
  }

  static slugTaken(slug: string): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tenant_slug_taken',
      `The short name "${slug}" is already in use. Pick another.`,
    );
  }

  static wrongStatus(detail: string): ProblemException {
    return new ProblemException(HttpStatus.CONFLICT, 'tenant_status_conflict', detail);
  }

  static deleted(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tenant_deleted',
      'This tenant was deleted and cannot be changed.',
    );
  }

  static confirmationMismatch(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'confirmation_mismatch',
      "Type the tenant's short name exactly to confirm the deletion.",
    );
  }

  static tooEarlyToDelete(allowedFrom: Date): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'tenant_deletion_too_early',
      `A tenant can be deleted 30 days after it was suspended, from ${allowedFrom.toISOString().slice(0, 10)}.`,
    );
  }

  static moduleNotGated(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `"${key}" is not a module that can be switched per tenant.`,
    );
  }

  static alreadyOwner(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'already_member',
      'This person is already in the tenant. Owners change roles from the portal.',
    );
  }
}
