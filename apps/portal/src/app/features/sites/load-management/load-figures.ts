import { LoadCharger, LoadManagement } from '../../../core/api/models/load-management';

/** The four figures over a site's load management, in the words of its KPI cards. */
export interface LoadFigureWords {
  headroom: number;
  room: string;
  waiting: string;
  applied: string;
  unconfirmed: string;
}

/** How much of the site limit is handed out, and whether the chargers took their caps. */
export class LoadFigures {
  /** A fast charge needs about this much; with this much headroom one more fits. */
  static readonly FAST_CHARGE_KW = 50;

  static of(view: LoadManagement): LoadFigureWords {
    const { policy, chargers } = view;
    const headroom = Math.max(Math.round((policy.limit_kw - view.allocated_kw) * 10) / 10, 0);
    const capped = chargers.filter((charger) => charger.allocated_kw !== null);
    const applied = capped.filter((charger) => charger.is_applied && !charger.last_error).length;
    const unconfirmed = capped.length - applied;
    const waiting = chargers.filter((charger) => charger.reason === 'waiting').length;
    return {
      headroom,
      room: LoadFigures.room(headroom, policy.min_power_kw),
      waiting: waiting > 0 ? `${waiting} waiting for power` : 'None waiting for power',
      applied: `${applied} of ${capped.length}`,
      unconfirmed:
        unconfirmed > 0
          ? `${unconfirmed} ${unconfirmed === 1 ? 'charger' : 'chargers'} did not confirm`
          : '',
    };
  }

  /** How full a charger's bar is: its cap against the most it can take. */
  static shareOf(charger: LoadCharger, limitKw: number): number {
    const most = charger.max_power_kw ?? charger.connectors_max_kw ?? limitKw;
    return most > 0 ? Math.min((100 * (charger.allocated_kw ?? 0)) / most, 100) : 0;
  }

  private static room(headroom: number, minimumKw: number): string {
    if (headroom >= LoadFigures.FAST_CHARGE_KW) {
      return 'Room for another fast charge';
    }
    return headroom >= minimumKw ? 'Room for another car' : 'At the limit: new cars wait';
  }
}
