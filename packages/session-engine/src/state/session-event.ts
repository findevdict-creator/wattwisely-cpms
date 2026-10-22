/**
 * What can happen to a session. Each one is recorded in session_state_changes, even
 * when it leaves the state as it was (an unplug after the transaction ended, say).
 */
export type SessionEvent =
  | 'authorised'
  | 'declined'
  | 'transaction_started'
  | 'start_timeout'
  | 'suspended'
  | 'resumed'
  | 'energy_stopped'
  | 'energy_resumed'
  | 'transaction_ended'
  | 'unplugged'
  | 'priced'
  | 'no_valid_stop_data'
  | 'stale'
  | 'closed_by_staff';
