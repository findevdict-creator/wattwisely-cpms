import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsString, IsUrl, Max, Min } from 'class-validator';

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

  /** The portal's public address, used for links in e-mails (e.g. invitations). */
  @IsUrl({ require_tld: false })
  portalUrl!: string;

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
}
