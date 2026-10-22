import { hostname } from 'node:os';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CommandCatalog } from '@wattwisely/ocpp-contracts';
import { GatewayConfig } from './gateway.config';

/** Builds a GatewayConfig from environment variables and refuses to start if anything is invalid. */
export class GatewayConfigLoader {
  static readonly DEFAULTS = {
    PORT: '3100',
    OCPP_HEARTBEAT_INTERVAL_S: '300',
    OCPP_WATCH_INTERVAL_MS: '30000',
    OCPP_LEASE_SECONDS: '90',
    OCPP_COMMAND_TIMEOUT_MS: String(CommandCatalog.REPLY_TIMEOUT_MS),
    OCPP_PING_TIMEOUT_MS: '5000',
    OCPP_REJECT_CLOSE_DELAY_MS: '10000',
    OCPP_DISCONNECT_GRACE_MS: '60000',
    OCPP_MAX_FRAME_BYTES: '65536',
    OCPP_RATE_LIMIT_PER_CHARGER: '10',
    OCPP_RATE_LIMIT_PER_IP: '100',
  };

  load(environment: NodeJS.ProcessEnv): GatewayConfig {
    const get = (key: keyof typeof GatewayConfigLoader.DEFAULTS) =>
      environment[key] ?? GatewayConfigLoader.DEFAULTS[key];
    const config = plainToInstance(GatewayConfig, {
      port: Number(get('PORT')),
      databaseUrl: environment['DATABASE_URL'] ?? '',
      instanceId: environment['OCPP_INSTANCE_ID'] ?? `${hostname()}:${process.pid}`,
      isTlsRequired: environment['OCPP_REQUIRE_TLS'] !== 'false',
      isProxyTrusted: environment['OCPP_TRUST_PROXY'] === 'true',
      isAnyIdTagAccepted: environment['OCPP_ACCEPT_UNKNOWN_ID_TAGS'] === 'true',
      heartbeatIntervalS: Number(get('OCPP_HEARTBEAT_INTERVAL_S')),
      watchIntervalMs: Number(get('OCPP_WATCH_INTERVAL_MS')),
      leaseSeconds: Number(get('OCPP_LEASE_SECONDS')),
      commandTimeoutMs: Number(get('OCPP_COMMAND_TIMEOUT_MS')),
      pingTimeoutMs: Number(get('OCPP_PING_TIMEOUT_MS')),
      rejectCloseDelayMs: Number(get('OCPP_REJECT_CLOSE_DELAY_MS')),
      disconnectGraceMs: Number(get('OCPP_DISCONNECT_GRACE_MS')),
      maxFrameBytes: Number(get('OCPP_MAX_FRAME_BYTES')),
      rateLimitPerCharger: Number(get('OCPP_RATE_LIMIT_PER_CHARGER')),
      rateLimitPerIp: Number(get('OCPP_RATE_LIMIT_PER_IP')),
    });
    this.validate(config);
    return config;
  }

  private validate(config: GatewayConfig): void {
    const errors = validateSync(config);
    if (errors.length > 0) {
      const details = errors.map((error) => Object.values(error.constraints ?? {}).join(', '));
      throw new Error(`Invalid gateway configuration: ${details.join('; ')}`);
    }
  }
}
