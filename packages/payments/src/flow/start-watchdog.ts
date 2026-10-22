import { Transaction } from '@wattwisely/db';
import { CommandCatalog } from '@wattwisely/ocpp-contracts';
import {
  SessionEvent,
  SessionRow,
  SessionState,
  SessionStore,
  SessionTransitions,
} from '@wattwisely/session-engine';
import { PaymentStore } from '../store/payment-store';
import { CommandQueuer } from './command-queuer';
import { SessionAnnouncer } from './session-announcer';

/**
 * Gives up on a paid session that does not get going (Stripe Payments design, "When it
 * goes wrong"): a driver who never confirms the hold within 15 minutes, a charger that
 * rejects the start, or one that has not started 90 seconds after the hold. The session
 * ends as not_started; the settler then releases whatever hold there is.
 */
export class StartWatchdog {
  static readonly HOLD_WINDOW_MS = 15 * 60 * 1000;
  static readonly START_WINDOW_MS = 90 * 1000;

  private readonly sessions = new SessionStore();
  private readonly payments = new PaymentStore();
  private readonly transitions = new SessionTransitions();
  private readonly commands = new CommandQueuer();
  private readonly announcer = new SessionAnnouncer();

  /** The end state the session was given, or null when it may keep waiting. */
  async check(tx: Transaction, session: SessionRow, now: Date): Promise<SessionState | null> {
    const waitedMs = now.getTime() - session.lastEventAt.getTime();
    if (session.status === 'authorising') {
      return waitedMs >= StartWatchdog.HOLD_WINDOW_MS
        ? this.end(tx, session, 'declined', now)
        : null;
    }
    if (session.status !== 'starting') {
      return null;
    }
    const command = session.commandId ? await this.commands.statusOf(tx, session.commandId) : null;
    if (command && CommandCatalog.isFinal(command) && command !== 'accepted') {
      return this.end(tx, session, 'start_rejected', now);
    }
    return waitedMs >= StartWatchdog.START_WINDOW_MS
      ? this.end(tx, session, 'start_timeout', now)
      : null;
  }

  private async end(tx: Transaction, session: SessionRow, event: SessionEvent, now: Date) {
    const moved = await this.transitions.apply(tx, session, event, { occurredAt: now });
    if (!moved) {
      return null;
    }
    await this.sessions.saveFailure(tx, session.id, event);
    if (session.commandId) {
      await this.commands.expireQueued(tx, session.commandId);
    }
    const payment = await this.payments.findBySession(tx, session.id);
    await this.announcer.announce(tx, session, {
      status: moved.status,
      paymentStatus: payment?.status ?? 'released',
    });
    return moved.status;
  }
}
