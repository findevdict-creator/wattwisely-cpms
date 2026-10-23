import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import { alerts, Transaction, UuidV7 } from '@wattwisely/db';
import { AlertFinding } from './alert-finding';

/** An alert that is open or acknowledged. */
export interface LiveAlert {
  id: string;
  type: string;
  subjectKey: string;
}

/** Writes the tenant's alerts for the tracker. Every query runs inside one tenant. */
@Injectable()
export class AlertStoreRepository {
  async findLive(tx: Transaction): Promise<LiveAlert[]> {
    return tx
      .select({ id: alerts.id, type: alerts.type, subjectKey: alerts.subjectKey })
      .from(alerts)
      .where(ne(alerts.status, 'closed'));
  }

  /** The alert for this problem that closed at or after `since`, if any: a flapping charger reuses it. */
  async findClosedSince(
    tx: Transaction,
    finding: AlertFinding,
    since: Date,
  ): Promise<string | null> {
    const [row] = await tx
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.type, finding.type),
          eq(alerts.subjectKey, finding.subjectKey),
          eq(alerts.status, 'closed'),
          gte(alerts.closedAt, since),
        ),
      )
      .orderBy(desc(alerts.closedAt))
      .limit(1);
    return row?.id ?? null;
  }

  async open(tx: Transaction, tenantId: string, finding: AlertFinding, now: Date): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(alerts).values({
      id,
      tenantId,
      type: finding.type,
      subjectKey: finding.subjectKey,
      siteId: finding.siteId,
      chargerId: finding.chargerId,
      connectorId: finding.connectorId,
      sessionId: finding.sessionId,
      title: finding.title,
      details: finding.details,
      beganAt: finding.beganAt,
      openedAt: now,
      lastSeenAt: now,
    });
    return id;
  }

  /** The problem is still there: keep the alert's words and details current (NTF-04: repeats update). */
  async touch(tx: Transaction, id: string, finding: AlertFinding, now: Date): Promise<void> {
    await tx
      .update(alerts)
      .set({ title: finding.title, details: finding.details, lastSeenAt: now, updatedAt: now })
      .where(eq(alerts.id, id));
  }

  /** The problem came back soon after it cleared: the same alert opens again, counted once more. */
  async reopen(tx: Transaction, id: string, finding: AlertFinding, now: Date): Promise<void> {
    await tx
      .update(alerts)
      .set({
        status: 'open',
        title: finding.title,
        details: finding.details,
        lastSeenAt: now,
        occurrences: sql`${alerts.occurrences} + 1`,
        acknowledgedBy: null,
        acknowledgedAt: null,
        acknowledgeNote: '',
        closedAt: null,
        closeReason: null,
        version: sql`${alerts.version} + 1`,
        updatedAt: now,
      })
      .where(eq(alerts.id, id));
  }

  /** The problem is gone: the alert closes by itself (NTF-04). */
  async close(tx: Transaction, id: string, now: Date): Promise<void> {
    await tx
      .update(alerts)
      .set({
        status: 'closed',
        closedAt: now,
        closeReason: 'cleared',
        version: sql`${alerts.version} + 1`,
        updatedAt: now,
      })
      .where(eq(alerts.id, id));
  }
}
