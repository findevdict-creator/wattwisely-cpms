import { Period } from '../model/pricing-usage';
import { PeriodMath } from './period-math';

/** Takes the grace period off the front of the idle time; what is left is billable. */
export class IdleGrace {
  static apply(idlePeriods: Period[], graceSeconds: number): Period[] {
    let remaining = graceSeconds;
    const billable: Period[] = [];
    for (const period of PeriodMath.normalise(idlePeriods)) {
      const seconds = PeriodMath.seconds(period);
      if (remaining >= seconds) {
        remaining -= seconds;
        continue;
      }
      billable.push({ from: new Date(period.from.getTime() + remaining * 1000), to: period.to });
      remaining = 0;
    }
    return billable;
  }
}
