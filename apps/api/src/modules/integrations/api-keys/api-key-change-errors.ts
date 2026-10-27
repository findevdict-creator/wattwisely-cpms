import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** The problems the /v1/api-keys endpoints answer with (module 16). */
export class ApiKeyChangeErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'api_key_not_found',
      'This API key does not exist.',
    );
  }

  static alreadyRevoked(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'api_key_revoked',
      'This API key was already revoked.',
    );
  }

  static permissionUnknown(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'permission_unknown',
      `There is no permission called ${key}.`,
    );
  }

  /** A key that could make keys would outlive its own revocation. */
  static permissionNotForKeys(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'permission_not_for_api_keys',
      `${key} cannot be given to an API key.`,
    );
  }

  /** Same code as giving a role beyond one's own access (module 2): it is the same rule. */
  static exceedsOwnAccess(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'role_exceeds_own_access',
      `You cannot give an API key ${key}, because you do not hold it for the whole company yourself.`,
    );
  }

  static expiryInPast(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'api_key_expiry_in_past',
      'The expiry date must be in the future.',
    );
  }
}
