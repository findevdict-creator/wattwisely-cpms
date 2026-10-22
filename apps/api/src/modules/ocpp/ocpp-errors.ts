import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the command, message log and live endpoints answer with. */
export class OcppErrors {
  /** For commands that cannot wait (a reset): the charger has no live connection. */
  static chargerOffline(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'charger_offline',
      'The charger is offline. This command cannot wait for it to reconnect.',
    );
  }

  static commandNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'command_not_found',
      'This command does not exist.',
    );
  }

  /** A connector named in a command body must be one of this charger's. */
  static connectorUnknown(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'connector_not_found',
      'This charger has no such connector.',
    );
  }

  static sessionNotActive(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'session_not_active',
      'There is no running session with this id on the charger.',
    );
  }
}
