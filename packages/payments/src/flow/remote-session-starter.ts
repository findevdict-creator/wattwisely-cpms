import { Transaction } from '@wattwisely/db';
import {
  SessionRow,
  SessionState,
  SessionStore,
  SessionTransitions,
} from '@wattwisely/session-engine';
import { PaymentStatus } from '../store/payment-rows';
import { CommandQueuer } from './command-queuer';
import { SessionAnnouncer } from './session-announcer';

/**
 * Moves a session opened away from the charger from `authorising` to `starting` and asks
 * the charger to begin: RemoteStart with the session's own tag, the command remembered on
 * the session, and the live stream told. A confirmed hold does this (module 6); a free
 * start from the app does it with no payment at all (module 19). Done twice, the second
 * call changes nothing.
 */
export class RemoteSessionStarter {
  private readonly sessions = new SessionStore();
  private readonly transitions = new SessionTransitions();
  private readonly commands = new CommandQueuer();
  private readonly announcer = new SessionAnnouncer();

  /** The state the session is in afterwards, or null when it was not waiting to be authorised. */
  async start(
    tx: Transaction,
    session: SessionRow,
    now: Date,
    paymentStatus: PaymentStatus | null,
  ): Promise<SessionState | null> {
    const moved = await this.transitions.apply(tx, session, 'authorised', { occurredAt: now });
    if (!moved?.isChanged) {
      return null;
    }
    const commandId = await this.commands.remoteStart(tx, session);
    await this.sessions.saveCommand(tx, session.id, commandId);
    await this.announcer.announce(tx, session, { status: moved.status, paymentStatus });
    return moved.status;
  }
}
