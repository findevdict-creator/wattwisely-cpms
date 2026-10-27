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
import { RetentionPeriods } from './retention-periods';
import { SmtpSettings } from '@wattwisely/mail';

/**
 * Typed settings for the worker, read from environment variables at startup and
 * validated, so a wrong setting stops the worker at boot. The intervals come from the
 * Sessions and Pricing design; tests make them long and run the jobs by hand.
 */
export class WorkerConfig implements SmtpSettings {
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  /** Postgres, as the wattwisely_app role: the same connection the API and the gateway use. */
  @IsUrl({ require_tld: false, protocols: ['postgres', 'postgresql'] })
  databaseUrl!: string;

  /** How often stopped sessions are checked for their final price. */
  @IsInt()
  @Min(100)
  finaliseIntervalMs!: number;

  /** How often the running cost of charging sessions is updated. */
  @IsInt()
  @Min(100)
  liveCostIntervalMs!: number;

  /** How often sessions that went silent for a day are closed. */
  @IsInt()
  @Min(100)
  staleSweepIntervalMs!: number;

  /** How often the holds of ended paid sessions are captured or released (module 6). */
  @IsInt()
  @Min(100)
  paymentSettleIntervalMs!: number;

  /** How often paid sessions that do not get going are given up on. */
  @IsInt()
  @Min(100)
  startTimeoutIntervalMs!: number;

  /** How often stored webhook events that could not be handled are tried again. */
  @IsInt()
  @Min(100)
  webhookRetryIntervalMs!: number;

  /** How often managed service agreements whose end date has passed are ended (module 10). */
  @IsInt()
  @Min(100)
  managedServiceEndIntervalMs!: number;

  /** How often last month's invoices are drafted and overdue invoices mark a subscription past due (module 15). */
  @IsInt()
  @Min(100)
  invoiceIntervalMs!: number;

  /** How often new events are queued for webhook endpoints and due deliveries are sent (module 16). */
  @IsInt()
  @Min(100)
  webhookIntervalMs!: number;

  /** Whether a webhook may point at a private or local address (WEBHOOK_ALLOW_PRIVATE_URLS, module 16). */
  @IsBoolean()
  isWebhookPrivateUrlAllowed!: boolean;

  /** How often each managed site's power cap is shared out among its chargers (module 17). */
  @IsInt()
  @Min(100)
  loadManagementIntervalMs!: number;

  /** How often chat messages are sent and linked charges reported on (module 17). */
  @IsInt()
  @Min(100)
  messagingIntervalMs!: number;

  /** The driver app's address, for the charge and receipt links sent in chats (module 17). */
  @IsUrl({ require_tld: false })
  driverUrl!: string;

  /** The platform's WhatsApp Business token (module 17). Empty switches chat sending off. */
  @IsString()
  whatsappAccessToken!: string;

  /** Meta's Graph API, versioned. */
  @IsUrl({ require_tld: false })
  whatsappApiUrl!: string;

  /** How often chargers are checked for problems that open or close alerts (module 11). */
  @IsInt()
  @Min(100)
  alertScanIntervalMs!: number;

  /** How often sessions are checked for the e-mails their drivers asked for. */
  @IsInt()
  @Min(100)
  sessionNotifyIntervalMs!: number;

  /** How often the e-mail outbox is sent. */
  @IsInt()
  @Min(100)
  notificationSendIntervalMs!: number;

  /** How often queued report exports are built, and old ones expired. */
  @IsInt()
  @Min(100)
  reportExportIntervalMs!: number;

  /** How often scheduled reports that are due are queued. */
  @IsInt()
  @Min(100)
  reportScheduleIntervalMs!: number;

  /** How often old data is deleted (module 12). */
  @IsInt()
  @Min(1000)
  retentionIntervalMs!: number;

  /** How often the queue sizes the monitoring reads are counted (module 12). */
  @IsInt()
  @Min(1000)
  queueStatsIntervalMs!: number;

  /** How long things are kept, in days (module 12). See docs/modules/12-hardening-operations.md. */
  @ValidateNested()
  @Type(() => RetentionPeriods)
  retention!: RetentionPeriods;

  /** Where the API serves tenant logos, for the brand bar of e-mails. */
  @IsUrl({ require_tld: false })
  apiUrl!: string;

  /** The portal's address, for links in staff e-mails. */
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

  /** Stripe's secret key, the same as the API's. Empty switches the payment jobs' provider calls off. */
  @IsString()
  stripeSecretKey!: string;
}
