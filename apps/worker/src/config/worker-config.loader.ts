import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WorkerConfig } from './worker.config';

/** The settings that have a default. */
type WorkerSetting = keyof typeof WorkerConfigLoader.DEFAULTS;

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
    ALERT_SCAN_INTERVAL_MS: '30000',
    SESSION_NOTIFY_INTERVAL_MS: '30000',
    NOTIFICATION_SEND_INTERVAL_MS: '15000',
    REPORT_EXPORT_INTERVAL_MS: '15000',
    REPORT_SCHEDULE_INTERVAL_MS: '300000',
    SMTP_PORT: '587',
  };

  load(environment: NodeJS.ProcessEnv): WorkerConfig {
    const get = (key: WorkerSetting) => environment[key] ?? WorkerConfigLoader.DEFAULTS[key];
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
      ...this.notificationSettings(get),
      ...this.mailSettings(environment, get),
      stripeSecretKey: environment['STRIPE_SECRET_KEY'] ?? '',
    });
    const errors = validateSync(config);
    if (errors.length > 0) {
      const details = errors.map((error) => Object.values(error.constraints ?? {}).join(', '));
      throw new Error(`Invalid worker configuration: ${details.join('; ')}`);
    }
    return config;
  }

  private notificationSettings(get: (key: WorkerSetting) => string): Partial<WorkerConfig> {
    return {
      alertScanIntervalMs: Number(get('ALERT_SCAN_INTERVAL_MS')),
      sessionNotifyIntervalMs: Number(get('SESSION_NOTIFY_INTERVAL_MS')),
      notificationSendIntervalMs: Number(get('NOTIFICATION_SEND_INTERVAL_MS')),
      reportExportIntervalMs: Number(get('REPORT_EXPORT_INTERVAL_MS')),
      reportScheduleIntervalMs: Number(get('REPORT_SCHEDULE_INTERVAL_MS')),
    };
  }

  /** The same SMTP settings as the API's, and the addresses e-mails link to. */
  private mailSettings(
    environment: NodeJS.ProcessEnv,
    get: (key: WorkerSetting) => string,
  ): Partial<WorkerConfig> {
    return {
      apiUrl: environment['API_URL'] ?? '',
      portalUrl: environment['PORTAL_URL'] ?? '',
      smtpHost: environment['SMTP_HOST'] ?? '',
      smtpPort: Number(get('SMTP_PORT')),
      smtpFrom: environment['SMTP_FROM'] ?? '',
      smtpUser: environment['SMTP_USER'] ?? '',
      smtpPassword: environment['SMTP_PASSWORD'] ?? '',
      smtpStartTls: environment['SMTP_STARTTLS'] === 'true',
    };
  }
}
