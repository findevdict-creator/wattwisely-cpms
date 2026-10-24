import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the roles endpoints answer with (module 14). */
export class RoleErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'role_not_found',
      'This role does not exist.',
    );
  }

  /** The five built-in roles and the Managed operator role are the same for every tenant. */
  static isSystem(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'role_is_system',
      'Built-in roles are the same for every company and cannot be changed. Create a custom role instead.',
    );
  }

  static nameTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'role_name_taken',
      'A role with this name already exists.',
    );
  }

  static inUse(memberCount: number): ProblemException {
    const people = memberCount === 1 ? '1 person holds' : `${memberCount} people hold`;
    return new ProblemException(
      HttpStatus.CONFLICT,
      'role_in_use',
      `${people} this role. Give them another role first, then delete it.`,
    );
  }

  static permissionUnknown(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'permission_unknown',
      `There is no permission called ${key}.`,
    );
  }

  /** Same code as giving a role beyond one's own access (module 2), as it is the same rule. */
  static exceedsOwnAccess(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'role_exceeds_own_access',
      `You cannot put ${key} in a role, because you do not hold it for the whole company yourself.`,
    );
  }
}
