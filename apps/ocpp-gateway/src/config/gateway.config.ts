import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUrl, Max, Min } from 'class-validator';

/**
 * Typed settings for the OCPP gateway, read from environment variables at startup
 * and validated, so a wrong setting stops the gateway at boot. The timing values
 * come from the OCPP gateway design; tests shorten them.
 */
export class GatewayConfig {
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  /** Postgres, as the wattwisely_app role: the same connection the API uses. */
  @IsUrl({ require_tld: false, protocols: ['postgres', 'postgresql'] })
  databaseUrl!: string;

  /** Names this process in charger_connections, e.g. "gateway-1:42". */
  @IsString()
  @IsNotEmpty()
  instanceId!: string;

  /** When true, plain ws:// is refused unless the charger has allow_plain_ws. */
  @IsBoolean()
  isTlsRequired!: boolean;

  /** Behind Caddy: take the client address and scheme from X-Forwarded-* headers. */
  @IsBoolean()
  isProxyTrusted!: boolean;

  /** Accept Authorize and StartTransaction for any idTag, not only platform-issued ones (bench testing). */
  @IsBoolean()
  isAnyIdTagAccepted!: boolean;

  /** Sent to chargers in BootNotification.conf. */
  @IsInt()
  @Min(1)
  heartbeatIntervalS!: number;

  /** How often silent chargers are checked and leases renewed. */
  @IsInt()
  @Min(100)
  watchIntervalMs!: number;

  /** How long a connection lease lasts without renewal. */
  @IsInt()
  @Min(1)
  leaseSeconds!: number;

  /** How long to wait for a charger's reply to a command. */
  @IsInt()
  @Min(100)
  commandTimeoutMs!: number;

  /** How long an existing connection may take to answer a ping before it counts as dead. */
  @IsInt()
  @Min(100)
  pingTimeoutMs!: number;

  /** A charger whose boot was rejected is disconnected after this. */
  @IsInt()
  @Min(0)
  rejectCloseDelayMs!: number;

  /** Connectors of a disconnected charger are marked unavailable after this, unless it is back. */
  @IsInt()
  @Min(0)
  disconnectGraceMs!: number;

  @IsInt()
  @Min(1024)
  maxFrameBytes!: number;

  /** Upgrade attempts per charger identity and per client address, per minute. */
  @IsInt()
  @Min(1)
  rateLimitPerCharger!: number;

  @IsInt()
  @Min(1)
  rateLimitPerIp!: number;
}
