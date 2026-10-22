import { Charge } from '../core/api/models/charge';

/** Which page the driver sees: the session's state and the payment's, in one word. */
export type ChargePhase = 'card' | 'starting' | 'charging' | 'finishing' | 'done' | 'failed';

export class ChargePhases {
  static readonly RUNNING = ['charging', 'suspended', 'idle'];
  static readonly LIVE: ChargePhase[] = ['card', 'starting', 'charging', 'finishing'];

  static of(charge: Charge): ChargePhase {
    switch (charge.session_status) {
      case 'authorising':
        return charge.payment_status === 'pending' ? 'card' : 'starting';
      case 'starting':
        return 'starting';
      case 'stopping':
        return 'finishing';
      case 'completed':
        return 'done';
      case 'not_started':
      case 'failed':
        return 'failed';
      default:
        return 'charging';
    }
  }

  /** True while something is still going to happen: the page keeps asking the API. */
  static isLive(charge: Charge): boolean {
    if (ChargePhases.LIVE.includes(ChargePhases.of(charge))) {
      return true;
    }
    // Completed, but the worker has not settled the hold yet: the amount is about to change.
    return charge.session_status === 'completed' && charge.payment_status === 'authorised';
  }
}
