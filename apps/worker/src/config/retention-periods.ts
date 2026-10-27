import { IsInt, Max, Min } from 'class-validator';

/**
 * How many days the retention job keeps each kind of data before deleting it (module 12).
 * The defaults are a proposal until the retention policy is agreed (roadmap, phase 7);
 * sessions, payments, meter values and the audit log are records and are never deleted.
 */
export class RetentionPeriods {
  /** The raw OCPP message log (RETENTION_OCPP_MESSAGES_DAYS). */
  @IsInt()
  @Min(7)
  @Max(3650)
  ocppMessagesDays!: number;

  /** Sent, failed and cancelled e-mails in the outbox; they hold addresses (RETENTION_OUTBOX_DAYS). */
  @IsInt()
  @Min(1)
  @Max(3650)
  outboxDays!: number;

  /** The lines of the portal's bell (RETENTION_BELL_DAYS). */
  @IsInt()
  @Min(7)
  @Max(3650)
  bellDays!: number;

  /** A driver's address on a charge, counted from the end of the charge (RETENTION_DRIVER_EMAIL_DAYS). */
  @IsInt()
  @Min(1)
  @Max(3650)
  driverEmailDays!: number;

  /** The rows of expired and failed exports; the files themselves go after 7 days (RETENTION_EXPORTS_DAYS). */
  @IsInt()
  @Min(7)
  @Max(3650)
  exportsDays!: number;

  /** Processed payment webhook events (RETENTION_WEBHOOK_EVENTS_DAYS). */
  @IsInt()
  @Min(7)
  @Max(3650)
  webhookEventsDays!: number;

  /** Delivered and failed webhook deliveries to a tenant's endpoints (RETENTION_WEBHOOK_DELIVERIES_DAYS, module 16). */
  @IsInt()
  @Min(1)
  @Max(3650)
  webhookDeliveriesDays!: number;
}
