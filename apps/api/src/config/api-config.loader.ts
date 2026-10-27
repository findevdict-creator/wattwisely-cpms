import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { ApiConfig } from './api.config';
import { RateLimits } from './rate-limits';

/** Builds an ApiConfig from environment variables and refuses to start if anything is invalid. */
export class ApiConfigLoader {
  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_AUDIENCE = 'wattwisely-api';
  static readonly DEFAULT_DRIVER_AUDIENCE = 'wattwisely-driver';
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
      isApiDocsEnabled: environment['API_DOCS_ENABLED'] !== 'false',
      isWebhookPrivateUrlAllowed: environment['WEBHOOK_ALLOW_PRIVATE_URLS'] === 'true',
      ...this.whatsappSettings(environment),
      rateLimits: this.rateLimits(environment),
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
      keycloakDriverAudience:
        environment['KEYCLOAK_DRIVER_AUDIENCE'] ?? ApiConfigLoader.DEFAULT_DRIVER_AUDIENCE,
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

  /** Module 17: the WhatsApp Business app behind the messaging add-on. */
  private whatsappSettings(environment: NodeJS.ProcessEnv): Partial<ApiConfig> {
    return {
      whatsappAppSecret: environment['WHATSAPP_APP_SECRET'] ?? '',
      whatsappVerifyToken: environment['WHATSAPP_VERIFY_TOKEN'] ?? '',
      whatsappAccessToken: environment['WHATSAPP_ACCESS_TOKEN'] ?? '',
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

  /** Module 12: the budgets per client address and minute; RATE_LIMIT_ENABLED=false turns them off. */
  private rateLimits(environment: NodeJS.ProcessEnv): RateLimits {
    const number = (key: string, fallback: number) => Number(environment[key] ?? fallback);
    return plainToInstance(RateLimits, {
      isEnabled: environment['RATE_LIMIT_ENABLED'] !== 'false',
      default: number('RATE_LIMIT_PER_MINUTE', RateLimits.DEFAULT_PER_MINUTE),
      public: number('RATE_LIMIT_PUBLIC_PER_MINUTE', RateLimits.PUBLIC_PER_MINUTE),
      public_write: number(
        'RATE_LIMIT_PUBLIC_WRITE_PER_MINUTE',
        RateLimits.PUBLIC_WRITE_PER_MINUTE,
      ),
      apiKey: number('RATE_LIMIT_API_KEY_PER_MINUTE', RateLimits.API_KEY_PER_MINUTE),
    });
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
      throw new Error(`Invalid API configuration: ${this.messages(errors).join('; ')}`);
    }
  }

  /** Every broken rule, the rate limits' included. */
  private messages(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...this.messages(error.children ?? []),
    ]);
  }
}
