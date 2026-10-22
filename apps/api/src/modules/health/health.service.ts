import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '@wattwisely/db';
import { KeycloakKeySetProvider } from '../../common/auth/keycloak-key-set.provider';
import { HealthStatusDto } from './health-status.dto';

/** Answers "is the API alive" and "can it serve requests right now". */
@Injectable()
export class HealthService {
  constructor(
    private readonly keycloakKeys: KeycloakKeySetProvider,
    private readonly database: DatabaseClient,
  ) {}

  live(): HealthStatusDto {
    return new HealthStatusDto({});
  }

  async ready(): Promise<HealthStatusDto> {
    const [isKeycloakReachable, isDatabaseReachable] = await Promise.all([
      this.keycloakKeys.isReachable(),
      this.database.isReachable(),
    ]);
    return new HealthStatusDto({
      keycloak: isKeycloakReachable ? 'ok' : 'unavailable',
      database: isDatabaseReachable ? 'ok' : 'unavailable',
    });
  }
}
