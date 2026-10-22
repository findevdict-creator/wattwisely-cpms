/**
 * A session's state (Sessions and Pricing design, "Session states"). The working
 * states come first; completed, not_started and failed are the end states.
 */
export type SessionState =
  | 'authorising'
  | 'starting'
  | 'charging'
  | 'suspended'
  | 'idle'
  | 'stopping'
  | 'completed'
  | 'not_started'
  | 'failed';

/** Groups of states the gateway, the worker and the API ask about. */
export class SessionStates {
  static readonly ALL: SessionState[] = [
    'authorising',
    'starting',
    'charging',
    'suspended',
    'idle',
    'stopping',
    'completed',
    'not_started',
    'failed',
  ];
  /** A transaction is running on the connector. */
  static readonly ACTIVE: SessionState[] = ['charging', 'suspended', 'idle'];
  /** Not finished yet: the worker and the stale sweep look at these. */
  static readonly WORKING: SessionState[] = [
    'authorising',
    'starting',
    'charging',
    'suspended',
    'idle',
    'stopping',
  ];
  static readonly END: SessionState[] = ['completed', 'not_started', 'failed'];

  static isActive(state: SessionState): boolean {
    return SessionStates.ACTIVE.includes(state);
  }

  static isEnd(state: SessionState): boolean {
    return SessionStates.END.includes(state);
  }

  static isState(value: string): value is SessionState {
    return (SessionStates.ALL as string[]).includes(value);
  }
}
