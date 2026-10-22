import { Injectable } from '@nestjs/common';
import { KeycloakKeySetProvider } from '../../common/auth/keycloak-key-set.provider';
import { HealthStatusDto } from './health-status.dto';

/** Answers "is the API alive" and "can it serve requests right now". */
@Injectable()
export class HealthService {
  constructor(private readonly keycloakKeys: KeycloakKeySetProvider) {}

  live(): HealthStatusDto {
    return new HealthStatusDto({});
  }

  async ready(): Promise<HealthStatusDto> {
    const isKeycloakReachable = await this.keycloakKeys.isReachable();
    return new HealthStatusDto({ keycloak: isKeycloakReachable ? 'ok' : 'unavailable' });
  }
}
