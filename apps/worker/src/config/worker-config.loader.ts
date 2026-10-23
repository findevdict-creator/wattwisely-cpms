import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WorkerConfig } from './worker.config';

/** Builds a WorkerConfig from environment variables and refuses to start if anything is invalid. */
export class WorkerConfigLoader {
  static readonly DEFAULTS = {
    PORT: '3200',
    SESSION_FINALISE_INTERVAL_MS: '60000',
    SESSION_LIVE_COST_INTERVAL_MS: '30000',
    SESSION_STALE_SWEEP_INTERVAL_MS: '600000',
    PAYMENT_SETTLE_INTERVAL_MS: '30000',
    SESSION_START_TIMEOUT_INTERVAL_MS: '15000',
    PAYMENT_WEBHOOK_RETRY_INTERVAL_MS: '60000',
    MANAGED_SERVICE_END_INTERVAL_MS: '3600000',
  };

  load(environment: NodeJS.ProcessEnv): WorkerConfig {
    const get = (key: keyof typeof WorkerConfigLoader.DEFAULTS) =>
      environment[key] ?? WorkerConfigLoader.DEFAULTS[key];
    const config = plainToInstance(WorkerConfig, {
      port: Number(get('PORT')),
      databaseUrl: environment['DATABASE_URL'] ?? '',
      finaliseIntervalMs: Number(get('SESSION_FINALISE_INTERVAL_MS')),
      liveCostIntervalMs: Number(get('SESSION_LIVE_COST_INTERVAL_MS')),
      staleSweepIntervalMs: Number(get('SESSION_STALE_SWEEP_INTERVAL_MS')),
      paymentSettleIntervalMs: Number(get('PAYMENT_SETTLE_INTERVAL_MS')),
      startTimeoutIntervalMs: Number(get('SESSION_START_TIMEOUT_INTERVAL_MS')),
      webhookRetryIntervalMs: Number(get('PAYMENT_WEBHOOK_RETRY_INTERVAL_MS')),
      managedServiceEndIntervalMs: Number(get('MANAGED_SERVICE_END_INTERVAL_MS')),
      stripeSecretKey: environment['STRIPE_SECRET_KEY'] ?? '',
    });
    const errors = validateSync(config);
    if (errors.length > 0) {
      const details = errors.map((error) => Object.values(error.constraints ?? {}).join(', '));
      throw new Error(`Invalid worker configuration: ${details.join('; ')}`);
    }
    return config;
  }
}
