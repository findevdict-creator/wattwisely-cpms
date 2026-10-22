import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApiConfig } from './api.config';

/** Builds an ApiConfig from environment variables and refuses to start if anything is invalid. */
export class ApiConfigLoader {
  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_AUDIENCE = 'wattwisely-api';

  load(environment: NodeJS.ProcessEnv): ApiConfig {
    const issuerUrl = environment['KEYCLOAK_ISSUER_URL'] ?? '';
    const config = plainToInstance(ApiConfig, {
      port: Number(environment['PORT'] ?? ApiConfigLoader.DEFAULT_PORT),
      corsOrigins: this.splitList(environment['CORS_ORIGINS']),
      keycloakIssuerUrl: issuerUrl,
      keycloakJwksUrl:
        environment['KEYCLOAK_JWKS_URL'] ?? `${issuerUrl}/protocol/openid-connect/certs`,
      keycloakAudience: environment['KEYCLOAK_AUDIENCE'] ?? ApiConfigLoader.DEFAULT_AUDIENCE,
    });
    this.validate(config);
    return config;
  }

  private splitList(value: string | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private validate(config: ApiConfig): void {
    const errors = validateSync(config);
    if (errors.length > 0) {
      const details = errors.map((error) => Object.values(error.constraints ?? {}).join(', '));
      throw new Error(`Invalid API configuration: ${details.join('; ')}`);
    }
  }
}
