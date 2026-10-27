import { Charge } from '../core/api/models/charge';

/** What happens to the hold once a charge is paid. */
export class ChargeHold {
  /** The part of the hold that goes back to the card, in minor units; null when there is none. */
  static released(charge: Charge): number | null {
    if (charge.payment_status !== 'captured' || charge.amount === null) {
      return null;
    }
    const rest = charge.hold_amount - (charge.receipt?.gross ?? charge.amount);
    return rest > 0 ? rest : null;
  }
}
