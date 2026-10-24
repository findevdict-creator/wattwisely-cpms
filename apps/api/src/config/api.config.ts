import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RateLimits } from './rate-limits';

/**
 * Typed settings for the API, read from environment variables at startup.
 * Every value is validated, so a missing or wrong setting stops the API
 * at boot instead of failing later on a real request.
 */
export class ApiConfig {
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString({ each: true })
  corsOrigins!: string[];

  /** Public issuer URL that Keycloak writes into every token, e.g. https://auth.example.com/realms/wattwisely */
  @IsUrl({ require_tld: false })
  keycloakIssuerUrl!: string;

  /** Where the API downloads Keycloak's public signing keys (can be an internal address). */
  @IsUrl({ require_tld: false })
  keycloakJwksUrl!: string;

  /** The audience a token must carry to be accepted by this API. */
  @IsString()
  @IsNotEmpty()
  keycloakAudience!: string;

  /** Postgres, as the wattwisely_app role (row-level security always applies to it). */
  @IsUrl({ require_tld: false, protocols: ['postgres', 'postgresql'] })
  databaseUrl!: string;

  /** The API's own public address, e.g. https://api.example.com (module 8): logo links in e-mails and driver pages point here. */
  @IsUrl({ require_tld: false })
  apiUrl!: string;

  /** The portal's public address, used for links in e-mails (e.g. invitations). */
  @IsUrl({ require_tld: false })
  portalUrl!: string;

  /** Where chargers connect (the OCPP gateway), e.g. wss://ocpp.example.com/ocpp. Shown on setup cards. */
  @IsUrl({ require_tld: false, protocols: ['ws', 'wss'] })
  ocppUrl!: string;

  /** The same for the few chargers that cannot do TLS, e.g. ws://ocpp-plain.example.com/ocpp. */
  @IsUrl({ require_tld: false, protocols: ['ws', 'wss'] })
  ocppPlainUrl!: string;

  /** The driver app's public address, e.g. https://charge.example.com (module 7): QR codes point there. */
  @IsUrl({ require_tld: false })
  driverUrl!: string;

  @IsString()
  @IsNotEmpty()
  smtpHost!: string;

  @IsInt()
  smtpPort!: number;

  @IsEmail({ require_tld: false })
  smtpFrom!: string;

  @IsString()
  smtpUser!: string;

  @IsString()
  smtpPassword!: string;

  @IsBoolean()
  smtpStartTls!: boolean;

  /** Stripe (module 6). Empty keys switch card payments off; free sessions keep working. */
  @IsString()
  stripeSecretKey!: string;

  /** Handed to the driver's page for Stripe's card form. */
  @IsString()
  stripePublishableKey!: string;

  /** The signing secret of the Connect webhook endpoint (POST /v1/webhooks/stripe). */
  @IsString()
  stripeWebhookSecret!: string;

  /** Module 12: the OpenAPI pages at /docs (API_DOCS_ENABLED). Off on a production server. */
  @IsBoolean()
  isApiDocsEnabled!: boolean;

  /**
   * Module 16: whether a webhook endpoint may point at a private or local address
   * (WEBHOOK_ALLOW_PRIVATE_URLS). Off on a server: the worker would post into the network.
   */
  @IsBoolean()
  isWebhookPrivateUrlAllowed!: boolean;

  /** Module 17: the app secret Meta signs webhook deliveries with (WHATSAPP_APP_SECRET). Empty refuses them all. */
  @IsString()
  whatsappAppSecret!: string;

  /** Module 17: the token Meta echoes when the webhook is subscribed (WHATSAPP_VERIFY_TOKEN). */
  @IsString()
  whatsappVerifyToken!: string;

  /** Module 17: the platform's WhatsApp Business token; empty means every channel brings its own. */
  @IsString()
  whatsappAccessToken!: string;

  /** Module 12: requests per client address and minute (RATE_LIMIT_*). */
  @ValidateNested()
  @Type(() => RateLimits)
  rateLimits!: RateLimits;
}
