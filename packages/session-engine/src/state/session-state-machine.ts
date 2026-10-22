import { SessionEvent } from './session-event';
import { SessionState } from './session-state';

/** One allowed move: in any of `from`, this event leads to `to`. */
interface Transition {
  from: (SessionState | null)[];
  to: SessionState;
}

/**
 * The session state machine (Sessions and Pricing design, "Session states"), as a table.
 * `next` answers where an event leads, or null when the event is not allowed in that
 * state; callers then leave the session alone. `null` as a from-state is a new session.
 *
 * In this module sessions start at `charging`: a session row is created when the charger
 * starts the transaction. Authorising and starting are entered once payment holds and
 * driver authorisation exist (later modules); their moves are already here.
 */
export class SessionStateMachine {
  static readonly WORKING_TRANSACTION: SessionState[] = ['charging', 'suspended', 'idle'];
  static readonly TRANSITIONS: Record<SessionEvent, Transition[]> = {
    authorised: [{ from: ['authorising'], to: 'starting' }],
    declined: [{ from: ['authorising'], to: 'not_started' }],
    transaction_started: [{ from: [null, 'authorising', 'starting'], to: 'charging' }],
    start_timeout: [{ from: ['starting'], to: 'not_started' }],
    suspended: [{ from: ['charging', 'idle'], to: 'suspended' }],
    resumed: [{ from: ['suspended'], to: 'charging' }],
    energy_stopped: [{ from: ['charging'], to: 'idle' }],
    energy_resumed: [{ from: ['idle', 'suspended'], to: 'charging' }],
    transaction_ended: [
      { from: SessionStateMachine.WORKING_TRANSACTION, to: 'stopping' },
      { from: ['stopping'], to: 'stopping' },
    ],
    unplugged: [
      { from: SessionStateMachine.WORKING_TRANSACTION, to: 'stopping' },
      { from: ['stopping'], to: 'stopping' },
    ],
    priced: [{ from: ['stopping'], to: 'completed' }],
    no_valid_stop_data: [
      { from: [...SessionStateMachine.WORKING_TRANSACTION, 'stopping'], to: 'failed' },
    ],
    stale: [{ from: [...SessionStateMachine.WORKING_TRANSACTION, 'stopping'], to: 'failed' }],
    closed_by_staff: [
      {
        from: ['authorising', 'starting', ...SessionStateMachine.WORKING_TRANSACTION, 'stopping'],
        to: 'failed',
      },
    ],
  };

  static next(from: SessionState | null, event: SessionEvent): SessionState | null {
    const transition = SessionStateMachine.TRANSITIONS[event].find((candidate) =>
      candidate.from.includes(from),
    );
    return transition?.to ?? null;
  }
}
