import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApiConfig } from './api.config';

/** Builds an ApiConfig from environment variables and refuses to start if anything is invalid. */
export class ApiConfigLoader {
  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_AUDIENCE = 'wattwisely-api';
  static readonly DEFAULT_SMTP_PORT = 587;

  load(environment: NodeJS.ProcessEnv): ApiConfig {
    const config = plainToInstance(ApiConfig, {
      port: Number(environment['PORT'] ?? ApiConfigLoader.DEFAULT_PORT),
      corsOrigins: this.splitList(environment['CORS_ORIGINS']),
      ...this.keycloakSettings(environment),
      databaseUrl: environment['DATABASE_URL'] ?? '',
      ...this.publicAddresses(environment),
      ...this.smtpSettings(environment),
      stripeSecretKey: environment['STRIPE_SECRET_KEY'] ?? '',
      stripePublishableKey: environment['STRIPE_PUBLISHABLE_KEY'] ?? '',
      stripeWebhookSecret: environment['STRIPE_WEBHOOK_SECRET'] ?? '',
    });
    this.validate(config);
    return config;
  }

  private keycloakSettings(environment: NodeJS.ProcessEnv): Partial<ApiConfig> {
    const issuerUrl = environment['KEYCLOAK_ISSUER_URL'] ?? '';
    return {
      keycloakIssuerUrl: issuerUrl,
      keycloakJwksUrl:
        environment['KEYCLOAK_JWKS_URL'] ?? `${issuerUrl}/protocol/openid-connect/certs`,
      keycloakAudience: environment['KEYCLOAK_AUDIENCE'] ?? ApiConfigLoader.DEFAULT_AUDIENCE,
    };
  }

  /** Where the API, the portal, the driver app and the gateway are reached from outside. */
  private publicAddresses(environment: NodeJS.ProcessEnv): Partial<ApiConfig> {
    return {
      apiUrl: environment['API_URL'] ?? '',
      portalUrl: environment['PORTAL_URL'] ?? '',
      ocppUrl: environment['OCPP_URL'] ?? '',
      ocppPlainUrl: environment['OCPP_PLAIN_URL'] ?? '',
      driverUrl: environment['DRIVER_URL'] ?? '',
    };
  }

  private smtpSettings(environment: NodeJS.ProcessEnv): Partial<ApiConfig> {
    return {
      smtpHost: environment['SMTP_HOST'] ?? '',
      smtpPort: Number(environment['SMTP_PORT'] ?? ApiConfigLoader.DEFAULT_SMTP_PORT),
      smtpFrom: environment['SMTP_FROM'] ?? '',
      smtpUser: environment['SMTP_USER'] ?? '',
      smtpPassword: environment['SMTP_PASSWORD'] ?? '',
      smtpStartTls: environment['SMTP_STARTTLS'] === 'true',
    };
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
