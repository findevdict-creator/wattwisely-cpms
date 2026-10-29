import { ChargePhase } from './charge-phase';

/** One step over the live charge: done, the one under way, or still to come. */
export interface ChargeStep {
  label: string;
  state: 'done' | 'now' | 'todo';
}

/** Paid, Started, Charging, Done: the bar over a charge in progress. */
export class ChargeSteps {
  static readonly LABELS = ['Paid', 'Started', 'Charging', 'Done'];

  /** Which step each phase is on; a done charge has every step behind it. */
  static readonly CURRENT: Record<string, number> = {
    card: 0,
    starting: 1,
    charging: 2,
    finishing: 3,
    done: 4,
  };

  static of(phase: ChargePhase | null): ChargeStep[] {
    const current = ChargeSteps.CURRENT[phase ?? ''] ?? -1;
    return ChargeSteps.LABELS.map((label, index) => ({
      label,
      state: index < current ? 'done' : index === current ? 'now' : 'todo',
    }));
  }

  /** The bar shows while something still has to happen; the receipt and a failure have none. */
  static isShown(phase: ChargePhase | null): boolean {
    return ['card', 'starting', 'charging', 'finishing'].includes(phase ?? '');
  }
}
