import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the /v1/sites/{siteId}/load-management endpoints answer with (module 17). */
export class LoadManagementErrors {
  static siteNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'site_not_found',
      'This site does not exist.',
    );
  }

  static chargerNotAtSite(chargerId: string): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'charger_not_at_site',
      `Charger ${chargerId} is not at this site.`,
    );
  }

  static minimumAboveLimit(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'load_minimum_above_limit',
      'The minimum per charger cannot be more than the site limit.',
    );
  }
}
