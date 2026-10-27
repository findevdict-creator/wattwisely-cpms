import { and, eq, exists, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import {
  chargingSessions,
  notifications,
  ocppMessages,
  paymentWebhookEvents,
  reportExports,
  sessionSubscriptions,
  staffNotifications,
  webhookDeliveries,
} from '@wattwisely/db';
import { RetentionPeriods } from '../config/retention-periods';
import { RetentionRule } from './retention-rule';

/**
 * What the retention job deletes, and after how long (module 12). Only working data and
 * personal data with no further use: never sessions, payments, meter values, alerts or the
 * audit log, which are the records an operator, an auditor or a tax office asks for.
 */
export class RetentionRules {
  /** The rules that run inside each tenant. */
  static perTenant(periods: RetentionPeriods): RetentionRule[] {
    return [
      RetentionRules.messageLog(periods.ocppMessagesDays),
      RetentionRules.outbox(periods.outboxDays),
      {
        name: 'staff_notifications',
        table: staffNotifications,
        id: staffNotifications.id,
        days: periods.bellDays,
        isOld: (cutoff) => lt(staffNotifications.createdAt, cutoff),
      },
      RetentionRules.driverAddresses(periods.driverEmailDays),
      RetentionRules.exports(periods.exportsDays),
      RetentionRules.webhookDeliveries(periods.webhookDeliveriesDays),
    ];
  }

  /** Webhook events are global: they arrive before their tenant is known. */
  static global(periods: RetentionPeriods): RetentionRule[] {
    return [
      {
        name: 'payment_webhook_events',
        table: paymentWebhookEvents,
        id: paymentWebhookEvents.id,
        days: periods.webhookEventsDays,
        isOld: (cutoff) =>
          and(
            isNotNull(paymentWebhookEvents.processedAt),
            lt(paymentWebhookEvents.receivedAt, cutoff),
          ),
      },
    ];
  }

  private static messageLog(days: number): RetentionRule {
    return {
      name: 'ocpp_messages',
      table: ocppMessages,
      id: ocppMessages.id,
      days,
      isOld: (cutoff) => lt(ocppMessages.receivedAt, cutoff),
    };
  }

  /** Pending e-mails stay, however old: they are still to be sent. */
  private static outbox(days: number): RetentionRule {
    return {
      name: 'notifications',
      table: notifications,
      id: notifications.id,
      days,
      isOld: (cutoff) =>
        and(
          inArray(notifications.status, ['sent', 'failed', 'cancelled']),
          lt(notifications.createdAt, cutoff),
        ),
    };
  }

  /** Exports still queued, being built or ready stay; the file itself expires after 7 days. */
  private static exports(days: number): RetentionRule {
    return {
      name: 'report_exports',
      table: reportExports,
      id: reportExports.id,
      days,
      isOld: (cutoff) =>
        and(
          inArray(reportExports.status, ['expired', 'failed']),
          lt(reportExports.createdAt, cutoff),
        ),
    };
  }

  /** Pending deliveries stay, however old: they are still to be sent (module 16). */
  private static webhookDeliveries(days: number): RetentionRule {
    return {
      name: 'webhook_deliveries',
      table: webhookDeliveries,
      id: webhookDeliveries.id,
      days,
      isOld: (cutoff) =>
        and(
          inArray(webhookDeliveries.status, ['delivered', 'failed']),
          lt(webhookDeliveries.createdAt, cutoff),
        ),
    };
  }

  /** A driver's address goes some days after the charge ended (NTF-01: kept only with that charge). */
  private static driverAddresses(days: number): RetentionRule {
    return {
      name: 'session_subscriptions',
      table: sessionSubscriptions,
      id: sessionSubscriptions.id,
      days,
      isOld: (cutoff) =>
        exists(
          sql`(select 1 from ${chargingSessions} where ${and(
            eq(chargingSessions.tenantId, sessionSubscriptions.tenantId),
            eq(chargingSessions.id, sessionSubscriptions.sessionId),
            lt(chargingSessions.endedAt, cutoff),
          )})`,
        ),
    };
  }
}
