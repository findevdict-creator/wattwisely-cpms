import { SessionEvent } from './session-event';
import { SessionState, SessionStates } from './session-state';
import { SessionStateMachine } from './session-state-machine';

/** Every move the design allows, as [from, event, to]. */
const ALLOWED: [SessionState | null, SessionEvent, SessionState][] = [
  [null, 'hold_requested', 'authorising'],
  ['authorising', 'authorised', 'starting'],
  ['authorising', 'declined', 'not_started'],
  [null, 'transaction_started', 'charging'],
  ['authorising', 'transaction_started', 'charging'],
  ['starting', 'transaction_started', 'charging'],
  ['starting', 'start_timeout', 'not_started'],
  ['starting', 'start_rejected', 'not_started'],
  ['charging', 'suspended', 'suspended'],
  ['idle', 'suspended', 'suspended'],
  ['suspended', 'resumed', 'charging'],
  ['charging', 'energy_stopped', 'idle'],
  ['idle', 'energy_resumed', 'charging'],
  ['suspended', 'energy_resumed', 'charging'],
  ['charging', 'transaction_ended', 'stopping'],
  ['suspended', 'transaction_ended', 'stopping'],
  ['idle', 'transaction_ended', 'stopping'],
  ['stopping', 'transaction_ended', 'stopping'],
  ['charging', 'unplugged', 'stopping'],
  ['suspended', 'unplugged', 'stopping'],
  ['idle', 'unplugged', 'stopping'],
  ['stopping', 'unplugged', 'stopping'],
  ['stopping', 'priced', 'completed'],
  ['charging', 'no_valid_stop_data', 'failed'],
  ['suspended', 'no_valid_stop_data', 'failed'],
  ['idle', 'no_valid_stop_data', 'failed'],
  ['stopping', 'no_valid_stop_data', 'failed'],
  ['charging', 'stale', 'failed'],
  ['suspended', 'stale', 'failed'],
  ['idle', 'stale', 'failed'],
  ['stopping', 'stale', 'failed'],
  ['authorising', 'closed_by_staff', 'failed'],
  ['starting', 'closed_by_staff', 'failed'],
  ['charging', 'closed_by_staff', 'failed'],
  ['suspended', 'closed_by_staff', 'failed'],
  ['idle', 'closed_by_staff', 'failed'],
  ['stopping', 'closed_by_staff', 'failed'],
];

describe('SessionStateMachine', () => {
  it.each(ALLOWED)('moves %s on %s to %s', (from, event, to) => {
    expect(SessionStateMachine.next(from, event)).toBe(to);
  });

  it('refuses every other move', () => {
    const events = Object.keys(SessionStateMachine.TRANSITIONS) as SessionEvent[];
    const states: (SessionState | null)[] = [null, ...SessionStates.ALL];
    for (const event of events) {
      for (const from of states) {
        const isAllowed = ALLOWED.some(([a, e]) => a === from && e === event);
        if (!isAllowed) {
          expect([from, event, SessionStateMachine.next(from, event)]).toEqual([from, event, null]);
        }
      }
    }
  });

  it('never leaves an end state', () => {
    const events = Object.keys(SessionStateMachine.TRANSITIONS) as SessionEvent[];
    for (const state of SessionStates.END) {
      expect(events.map((event) => SessionStateMachine.next(state, event))).toEqual(
        events.map(() => null),
      );
    }
  });
});
