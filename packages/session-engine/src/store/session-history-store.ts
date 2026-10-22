import { asc, eq } from 'drizzle-orm';
import { sessionStateChanges, Transaction } from '@wattwisely/db';
import { SessionState } from '../state/session-state';

/** One row of a session's history, as the timeline reads it. */
export interface StateChange {
  fromStatus: SessionState | null;
  toStatus: SessionState;
  event: string;
  occurredAt: Date;
}

/** Reads a session's state history, oldest first. */
export class SessionHistoryStore {
  async list(tx: Transaction, sessionId: string): Promise<StateChange[]> {
    const rows = await tx
      .select({
        fromStatus: sessionStateChanges.fromStatus,
        toStatus: sessionStateChanges.toStatus,
        event: sessionStateChanges.event,
        occurredAt: sessionStateChanges.occurredAt,
      })
      .from(sessionStateChanges)
      .where(eq(sessionStateChanges.sessionId, sessionId))
      .orderBy(asc(sessionStateChanges.occurredAt), asc(sessionStateChanges.createdAt));
    return rows as StateChange[];
  }
}
