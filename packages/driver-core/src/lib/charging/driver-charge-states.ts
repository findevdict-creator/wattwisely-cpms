import { DriverChargeDetail } from '../api/models/driver-payments';
import { ChargePhase } from '../format/charge-phase';

/** Which screen fits one of the driver's own charges now. */
export type DriverChargeView = 'starting' | 'live' | 'complete' | 'failed';

/**
 * The states of a charge started with the login (module 19), as both apps show them (moved
 * from the mobile app in module 36): starting, live, complete, or why it did not start, and
 * when there is nothing left to follow.
 */
export class DriverChargeStates {
  static readonly STARTING = ['authorising', 'starting'];
  static readonly LIVE = ['charging', 'suspended', 'idle', 'stopping'];

  static view(charge: DriverChargeDetail): DriverChargeView {
    if (charge.payment?.status === 'failed' || ['not_started', 'failed'].includes(charge.status)) {
      return 'failed';
    }
    if (DriverChargeStates.STARTING.includes(charge.status)) {
      return 'starting';
    }
    return DriverChargeStates.LIVE.includes(charge.status) ? 'live' : 'complete';
  }

  /** Settled once the charge ended and any hold has been taken or released. */
  static isSettled(charge: DriverChargeDetail): boolean {
    const view = DriverChargeStates.view(charge);
    const isEnded = view === 'complete' || view === 'failed';
    return (
      isEnded && charge.payment?.status !== 'authorised' && charge.payment?.status !== 'pending'
    );
  }

  /** The step the bar over the charge is on: Paid (or Free), Started, Charging, Done. */
  static phase(charge: DriverChargeDetail): ChargePhase {
    switch (DriverChargeStates.view(charge)) {
      case 'starting':
        return 'starting';
      case 'live':
        return charge.status === 'stopping' ? 'finishing' : 'charging';
      case 'complete':
        return 'done';
      default:
        return 'failed';
    }
  }

  /** The part of the hold that goes back to the card once it is taken; null when there is none. */
  static released(charge: DriverChargeDetail): number | null {
    const payment = charge.payment;
    if (!payment || payment.status !== 'captured') {
      return null;
    }
    const rest = payment.hold_amount - (charge.receipt?.gross ?? charge.amount ?? 0);
    return rest > 0 ? rest : null;
  }
}
