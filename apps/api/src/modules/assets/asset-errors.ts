import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the sites, chargers and connectors endpoints answer with. */
export class AssetErrors {
  static siteNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'site_not_found',
      'This site does not exist.',
    );
  }

  /** For a site named in a request body (registering a charger, giving a role on a site). */
  static siteUnknown(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'site_not_found',
      'One of the sites does not exist.',
    );
  }

  static siteNameTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'site_name_taken',
      'You already have a site with this name.',
    );
  }

  static siteHasChargers(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'site_has_chargers',
      'Move or remove the chargers on this site first.',
    );
  }

  static chargerNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'charger_not_found',
      'This charger does not exist.',
    );
  }

  /** The same wording whoever holds the identity: the other tenant is never named (story AST-02). */
  static identityTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'identity_taken',
      'This charger ID is already in use. Choose another one.',
    );
  }

  static identityRequired(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'identity_required',
      'Enter the charger’s own ID: letters, digits, dash, underscore and dot, up to 48 characters.',
    );
  }

  static connectorNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'connector_not_found',
      'This connector does not exist.',
    );
  }

  static connectorNumberTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'connector_number_taken',
      'This charger already has a connector with this number.',
    );
  }

  static connectorLabelTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'connector_label_taken',
      'This charger already has a connector with this label.',
    );
  }

  static connectorReported(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'connector_reported',
      'The charger has reported this connector, so it cannot be removed. Mark it unavailable instead.',
    );
  }
}
