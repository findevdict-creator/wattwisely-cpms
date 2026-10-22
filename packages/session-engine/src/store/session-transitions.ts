import { and, eq } from 'drizzle-orm';
import { chargingSessions, sessionStateChanges, Transaction, UuidV7 } from '@wattwisely/db';
import { SessionEvent } from '../state/session-event';
import { SessionState, SessionStates } from '../state/session-state';
import { SessionStateMachine } from '../state/session-state-machine';

/** What a move needs to know about the session. */
export interface SessionRef {
  id: string;
  tenantId: string;
  status: SessionState;
}

/** The outcome of a move: the new state, and whether it differs from the old one. */
export interface Moved {
  status: SessionState;
  isChanged: boolean;
}

/**
 * Moves a session through the state machine and writes the history row, in the
 * caller's transaction. The status update only applies while the row still has the
 * state the caller read, so the gateway and the worker can never undo each other's move.
 */
export class SessionTransitions {
  /** The new state, or null when the event is not allowed now (nothing is written then). */
  async apply(
    tx: Transaction,
    session: SessionRef,
    event: SessionEvent,
    change: { occurredAt: Date; details?: Record<string, unknown> },
  ): Promise<Moved | null> {
    const next = SessionStateMachine.next(session.status, event);
    if (next === null) {
      return null;
    }
    if (next !== session.status && !(await this.updateStatus(tx, session, next))) {
      return null;
    }
    await this.record(tx, session, { from: session.status, to: next, event, ...change });
    return { status: next, isChanged: next !== session.status };
  }

  /** The first history row of a session that has just been created. */
  async created(tx: Transaction, session: SessionRef, event: SessionEvent, occurredAt: Date) {
    await this.record(tx, session, { from: null, to: session.status, event, occurredAt });
  }

  private async updateStatus(tx: Transaction, session: SessionRef, next: SessionState) {
    const rows = await tx
      .update(chargingSessions)
      .set({
        status: next,
        closedAt: SessionStates.isEnd(next) ? new Date() : null,
        lastEventAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(chargingSessions.id, session.id), eq(chargingSessions.status, session.status)))
      .returning({ id: chargingSessions.id });
    return rows.length === 1;
  }

  private async record(
    tx: Transaction,
    session: SessionRef,
    change: {
      from: SessionState | null;
      to: SessionState;
      event: SessionEvent;
      occurredAt: Date;
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.insert(sessionStateChanges).values({
      id: UuidV7.create(),
      tenantId: session.tenantId,
      sessionId: session.id,
      fromStatus: change.from,
      toStatus: change.to,
      event: change.event,
      occurredAt: change.occurredAt,
      details: change.details ?? {},
    });
  }
}
