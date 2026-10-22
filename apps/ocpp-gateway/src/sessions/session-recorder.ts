import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import {
  SessionEvent,
  SessionEventData,
  SessionRow,
  SessionState,
  SessionTransitions,
} from '@wattwisely/session-engine';
import { ChargerEventPublisher } from '../events/charger-event.publisher';

/** What happened, for the history row and the live event. */
export interface SessionChange {
  occurredAt: Date;
  energyWh?: number;
  details?: Record<string, unknown>;
  /** Extra fields for the live event. */
  extra?: Record<string, unknown>;
  /** Announce even when the state stays the same (a stop after the car already left). */
  isAnnouncedAnyway?: boolean;
}

/**
 * Moves a session through its states as the charger reports, writes the history row
 * and tells the live stream. Nothing happens when the event is not allowed in the
 * session's state (a resumed charge on a session that already stopped, say).
 */
@Injectable()
export class SessionRecorder {
  constructor(
    private readonly transitions: SessionTransitions,
    private readonly publisher: ChargerEventPublisher,
  ) {}

  /** The first history row of a session that was just opened, and the live event for it. */
  async opened(tx: Transaction, session: SessionRow): Promise<void> {
    await this.transitions.created(tx, session, 'transaction_started', session.startedAt);
    await this.announce(tx, session, { status: session.status, energyWh: session.energyWh });
  }

  /** The new state, or null when the event did not apply. */
  async move(
    tx: Transaction,
    session: SessionRow,
    event: SessionEvent,
    change: SessionChange,
  ): Promise<SessionState | null> {
    const moved = await this.transitions.apply(tx, session, event, change);
    if (moved?.isChanged || (moved && change.isAnnouncedAnyway)) {
      const energyWh = change.energyWh ?? session.energyWh;
      await this.announce(tx, session, { status: moved.status, energyWh, extra: change.extra });
    }
    return moved?.status ?? null;
  }

  /** A session.updated event with the session's state and energy, and any extra fields. */
  async announce(
    tx: Transaction,
    session: SessionRow,
    update: { status: SessionState; energyWh: number; extra?: Record<string, unknown> },
  ): Promise<void> {
    const data = SessionEventData.of(session, {
      status: update.status,
      energyWh: update.energyWh,
      grossAmount: session.grossAmount,
    });
    await this.publisher.publish(
      tx,
      { id: session.chargerId, tenantId: session.tenantId },
      'session.updated',
      { ...data, ...update.extra },
    );
  }
}
