import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import {
  alerts,
  notifications,
  reportExports,
  sessionSubscriptions,
  Transaction,
} from '@wattwisely/db';
import { MailContent } from '@wattwisely/mail';

/** A pending e-mail picked for sending, locked by the transaction that picked it. */
export interface DueMail {
  id: string;
  tenantId: string;
  kind: string;
  toAddress: string;
  content: MailContent;
  attempts: number;
  sessionId: string | null;
  alertId: string | null;
  exportId: string | null;
}

/** A ready export's file, as a scheduled report e-mail attaches it. */
export interface ExportFileRow {
  fileName: string;
  data: Buffer | null;
  storageKey: string | null;
}

/** Reads and updates the outbox for the sender. Every query runs inside one tenant. */
@Injectable()
export class OutboxRepository {
  /** The oldest due e-mail no other worker is sending right now. */
  async pickDue(tx: Transaction, now: Date): Promise<DueMail | null> {
    const rows = await tx
      .select({
        id: notifications.id,
        tenantId: notifications.tenantId,
        kind: notifications.kind,
        toAddress: notifications.toAddress,
        payload: notifications.payload,
        attempts: notifications.attempts,
        sessionId: notifications.sessionId,
        alertId: notifications.alertId,
        exportId: notifications.exportId,
      })
      .from(notifications)
      .where(and(eq(notifications.status, 'pending'), lte(notifications.sendAfter, now)))
      .orderBy(asc(notifications.sendAfter))
      .limit(1)
      .for('update', { skipLocked: true });
    const row = rows[0];
    return row ? { ...row, content: row.payload['content'] as MailContent } : null;
  }

  async markSent(tx: Transaction, id: string, now: Date): Promise<void> {
    await tx
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: now,
        attempts: sql`${notifications.attempts} + 1`,
        updatedAt: now,
      })
      .where(eq(notifications.id, id));
  }

  /** Tries again at `retryAt`, or gives up when that is null. */
  async markFailed(
    tx: Transaction,
    id: string,
    error: string,
    retryAt: Date | null,
  ): Promise<void> {
    await tx
      .update(notifications)
      .set({
        status: retryAt ? 'pending' : 'failed',
        sendAfter: retryAt ?? sql`${notifications.sendAfter}`,
        attempts: sql`${notifications.attempts} + 1`,
        lastError: error.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id));
  }

  async cancel(tx: Transaction, id: string, reason: string): Promise<void> {
    await tx
      .update(notifications)
      .set({ status: 'cancelled', lastError: reason, updatedAt: new Date() })
      .where(eq(notifications.id, id));
  }

  /** An alert e-mail held for quiet hours is dropped if the alert closed meanwhile. */
  async isAlertClosed(tx: Transaction, alertId: string): Promise<boolean> {
    const [row] = await tx
      .select({ status: alerts.status })
      .from(alerts)
      .where(eq(alerts.id, alertId));
    return !row || row.status === 'closed';
  }

  /** A bounced driver address gets no more e-mails about the session (NTF-01). */
  async markUndeliverable(tx: Transaction, sessionId: string): Promise<void> {
    await tx
      .update(sessionSubscriptions)
      .set({ isUndeliverable: true, updatedAt: new Date() })
      .where(eq(sessionSubscriptions.sessionId, sessionId));
  }

  /** Where the gzipped CSV of a scheduled report is: in the row, or in object storage. */
  async findExportFile(tx: Transaction, exportId: string): Promise<ExportFileRow | null> {
    const [row] = await tx
      .select({
        fileName: reportExports.fileName,
        data: reportExports.data,
        storageKey: reportExports.storageKey,
      })
      .from(reportExports)
      .where(and(eq(reportExports.id, exportId), eq(reportExports.status, 'ready')));
    return row && (row.data || row.storageKey) ? row : null;
  }
}
