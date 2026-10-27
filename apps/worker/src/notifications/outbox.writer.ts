import { Injectable } from '@nestjs/common';
import { notifications, Transaction, UuidV7 } from '@wattwisely/db';
import { OutboxEntry } from './outbox-entry';

/** Writes e-mails to the outbox inside the caller's transaction, once per dedupe key. */
@Injectable()
export class OutboxWriter {
  /** True when the entry is new; false when one with its key was already written. */
  async enqueue(tx: Transaction, entry: OutboxEntry): Promise<boolean> {
    const rows = await tx
      .insert(notifications)
      .values({
        id: UuidV7.create(),
        tenantId: entry.tenantId,
        kind: entry.kind,
        dedupeKey: entry.dedupeKey,
        toAddress: entry.toAddress,
        sessionId: entry.sessionId ?? null,
        alertId: entry.alertId ?? null,
        exportId: entry.exportId ?? null,
        membershipId: entry.membershipId ?? null,
        payload: { content: entry.content },
        sendAfter: entry.sendAfter ?? new Date(),
      })
      .onConflictDoNothing({ target: [notifications.tenantId, notifications.dedupeKey] })
      .returning({ id: notifications.id });
    return rows.length === 1;
  }
}
