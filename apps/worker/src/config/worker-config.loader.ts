import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { RetentionPeriods } from './retention-periods';
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
    SAVED_CARD_HOLD_INTERVAL_MS: '10000',
    PAYMENT_WEBHOOK_RETRY_INTERVAL_MS: '60000',
    MANAGED_SERVICE_END_INTERVAL_MS: '3600000',
    INVOICE_INTERVAL_MS: '3600000',
    WEBHOOK_INTERVAL_MS: '15000',
    LOAD_MANAGEMENT_INTERVAL_MS: '10000',
    MESSAGING_INTERVAL_MS: '10000',
    WHATSAPP_API_URL: 'https://graph.facebook.com/v21.0',
    ALERT_SCAN_INTERVAL_MS: '30000',
    SESSION_NOTIFY_INTERVAL_MS: '30000',
    NOTIFICATION_SEND_INTERVAL_MS: '15000',
    REPORT_EXPORT_INTERVAL_MS: '15000',
    REPORT_SCHEDULE_INTERVAL_MS: '300000',
    RETENTION_INTERVAL_MS: '3600000',
    QUEUE_STATS_INTERVAL_MS: '30000',
    RETENTION_OCPP_MESSAGES_DAYS: '90',
    RETENTION_OUTBOX_DAYS: '30',
    RETENTION_BELL_DAYS: '90',
    RETENTION_DRIVER_EMAIL_DAYS: '30',
    RETENTION_EXPORTS_DAYS: '90',
    RETENTION_WEBHOOK_EVENTS_DAYS: '90',
    RETENTION_WEBHOOK_DELIVERIES_DAYS: '30',
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
      savedCardHoldIntervalMs: Number(get('SAVED_CARD_HOLD_INTERVAL_MS')),
      webhookRetryIntervalMs: Number(get('PAYMENT_WEBHOOK_RETRY_INTERVAL_MS')),
      managedServiceEndIntervalMs: Number(get('MANAGED_SERVICE_END_INTERVAL_MS')),
      invoiceIntervalMs: Number(get('INVOICE_INTERVAL_MS')),
      webhookIntervalMs: Number(get('WEBHOOK_INTERVAL_MS')),
      isWebhookPrivateUrlAllowed: environment['WEBHOOK_ALLOW_PRIVATE_URLS'] === 'true',
      ...this.notificationSettings(get),
      ...this.operationsSettings(get),
      ...this.mailSettings(environment, get),
      ...this.addonSettings(environment, get),
      stripeSecretKey: environment['STRIPE_SECRET_KEY'] ?? '',
    });
    const errors = validateSync(config);
    if (errors.length > 0) {
      throw new Error(`Invalid worker configuration: ${this.messages(errors).join('; ')}`);
    }
    return config;
  }

  /** Every broken rule, the retention periods' included. */
  private messages(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...this.messages(error.children ?? []),
    ]);
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

  /** Module 12: the retention job, the queue counts for monitoring, and how long data is kept. */
  private operationsSettings(get: (key: WorkerSetting) => string): Partial<WorkerConfig> {
    return {
      retentionIntervalMs: Number(get('RETENTION_INTERVAL_MS')),
      queueStatsIntervalMs: Number(get('QUEUE_STATS_INTERVAL_MS')),
      retention: plainToInstance(RetentionPeriods, {
        ocppMessagesDays: Number(get('RETENTION_OCPP_MESSAGES_DAYS')),
        outboxDays: Number(get('RETENTION_OUTBOX_DAYS')),
        bellDays: Number(get('RETENTION_BELL_DAYS')),
        driverEmailDays: Number(get('RETENTION_DRIVER_EMAIL_DAYS')),
        exportsDays: Number(get('RETENTION_EXPORTS_DAYS')),
        webhookEventsDays: Number(get('RETENTION_WEBHOOK_EVENTS_DAYS')),
        webhookDeliveriesDays: Number(get('RETENTION_WEBHOOK_DELIVERIES_DAYS')),
      }),
    };
  }

  /** Module 17: the load management and messaging add-ons' jobs. */
  private addonSettings(
    environment: NodeJS.ProcessEnv,
    get: (key: WorkerSetting) => string,
  ): Partial<WorkerConfig> {
    return {
      loadManagementIntervalMs: Number(get('LOAD_MANAGEMENT_INTERVAL_MS')),
      messagingIntervalMs: Number(get('MESSAGING_INTERVAL_MS')),
      driverUrl: environment['DRIVER_URL'] ?? '',
      whatsappAccessToken: environment['WHATSAPP_ACCESS_TOKEN'] ?? '',
      whatsappApiUrl: get('WHATSAPP_API_URL'),
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
