import { DriverChargeDetail, Money } from '@wattwisely/driver-core';

/** One line of the design's "Starting your charge" card. */
export interface StartingStep {
  label: string;
  state: 'done' | 'now' | 'todo';
}

/**
 * The steps between "Start" and the car charging (Figma 10, "Starting"): the card's hold (or
 * none needed), the charger answering, the car plugged in, and the charge under way.
 */
export class StartingSteps {
  static readonly RUNNING = ['charging', 'suspended', 'idle', 'stopping', 'completed'];

  static of(charge: DriverChargeDetail): StartingStep[] {
    const isHeld = !charge.is_paid || charge.payment?.status === 'authorised';
    const isRunning = StartingSteps.RUNNING.includes(charge.status);
    return [
      { label: StartingSteps.holdLabel(charge), state: isHeld ? 'done' : 'now' },
      {
        label: 'Waiting for the charger…',
        state: isRunning ? 'done' : isHeld ? 'now' : 'todo',
      },
      { label: 'Plug in your car', state: isRunning ? 'done' : 'todo' },
      { label: 'Charging', state: isRunning ? 'done' : 'todo' },
    ];
  }

  /** "Card approved · hold €20.00", or the rule that made the charge free. */
  private static holdLabel(charge: DriverChargeDetail): string {
    if (!charge.is_paid) {
      return charge.payment_rule?.words ?? 'No card needed';
    }
    const hold = charge.payment ? Money.format(charge.payment.hold_amount, charge.currency) : '';
    return charge.payment?.status === 'authorised'
      ? `Card approved · hold ${hold}`
      : 'Asking your bank for the hold…';
  }
}
